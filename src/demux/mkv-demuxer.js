/*
 * @author esterTion <esterTionCN@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Log from '../utils/logger.js';
import SPSParser from './sps-parser.js';
import DemuxErrors from './demux-errors.js';
import MediaInfo from '../core/media-info.js';
import MKVParser from './mkv-parser.js';
import { IllegalStateException } from '../utils/exception.js';

const _mkvParser = new MKVParser();

class MKVDemuxer {

    constructor(probeData, config) {
        this.TAG = 'MkvDemuxer';

        this._config = config;

        this._onError = null;
        this._onMediaInfo = null;
        this._onTrackMetadata = null;
        this._onDataAvailable = null;

        this._segmentOccured = false;
        this._seekHeaderOffset = -1;
        this._seekHeaderTab = null;
        this._segmentInfo = null;
        this._segmentTracks = null;
        this._segmentCues = null;

        this._defaultVideoTrack = null;
        this._defaultAudioTrack = null;
        this._defaultAudioScaledDuration = 0;
        this._defaultVideoScaledDuration = 0;

        this._lastVideoDts = 0;
        this._lastClusterOffset = -1;

        // for seek to read cues and resume
        this._seekForCues = false;
        this._resumePosition = -1;

        this._dispatch = false;

        this._hasAudio = false;
        this._hasVideo = false;

        this._audioInitialMetadataDispatched = false;
        this._videoInitialMetadataDispatched = false;

        this._mediaInfo = new MediaInfo();
        this._mediaInfo.hasAudio = this._hasAudio;
        this._mediaInfo.hasVideo = this._hasVideo;
        this._metadata = null;
        this._audioMetadata = null;
        this._videoMetadata = null;

        this._naluLengthSize = 4;
        this._timestampBase = 0;  // int32, in milliseconds
        this._timescale = 1000;
        this._duration = 0;  // int32, in milliseconds
        this._durationOverrided = false;
        this._referenceFrameRate = {
            fixed: true,
            fps: 23.976,
            fps_num: 23976,
            fps_den: 1000
        };

        this._mpegSamplingRates = [
            96000, 88200, 64000, 48000, 44100, 32000,
            24000, 22050, 16000, 12000, 11025, 8000, 7350
        ];

        this._videoTrack = { type: 'video', id: 1, sequenceNumber: 0, samples: [], length: 0 };
        this._audioTrack = { type: 'audio', id: 2, sequenceNumber: 0, samples: [], length: 0 };

        this._littleEndian = (function () {
            let buf = new ArrayBuffer(2);
            (new DataView(buf)).setInt16(0, 256, true);  // little-endian write
            return (new Int16Array(buf))[0] === 256;  // platform-spec read, if equal then LE
        })();
    }

    destroy() {
        this._mediaInfo = null;
        this._metadata = null;
        this._audioMetadata = null;
        this._videoMetadata = null;
        this._videoTrack = null;
        this._audioTrack = null;

        this._onError = null;
        this._onMediaInfo = null;
        this._onTrackMetadata = null;
        this._onDataAvailable = null;
    }

    static probe(buffer) {
        let isMatch = _mkvParser.isMatroska(buffer, 0, buffer.byteLength);
        return {
            match: isMatch
        };
    }

    bindDataSource(loader) {
        loader.onDataArrival = this.parseChunks.bind(this);
        return this;
    }

    // prototype: function(type: string, metadata: any): void
    get onTrackMetadata() {
        return this._onTrackMetadata;
    }

    set onTrackMetadata(callback) {
        this._onTrackMetadata = callback;
    }

    // prototype: function(mediaInfo: MediaInfo): void
    get onMediaInfo() {
        return this._onMediaInfo;
    }

    set onMediaInfo(callback) {
        this._onMediaInfo = callback;
    }

    // prototype: function(type: number, info: string): void
    get onError() {
        return this._onError;
    }

    set onError(callback) {
        this._onError = callback;
    }

    // prototype: function(videoTrack: any, audioTrack: any): void
    get onDataAvailable() {
        return this._onDataAvailable;
    }

    set onDataAvailable(callback) {
        this._onDataAvailable = callback;
    }

    // timestamp base for output samples, must be in milliseconds
    get timestampBase() {
        return this._timestampBase;
    }

    set timestampBase(base) {
        this._timestampBase = base;
    }

    get overridedDuration() {
        return this._duration;
    }

    // Force-override media duration. Must be in milliseconds, int32
    set overridedDuration(duration) {
        this._durationOverrided = true;
        this._duration = duration;
        this._mediaInfo.duration = duration;
    }

    resetMediaInfo() {
        this._mediaInfo = new MediaInfo();
        this._seekForCues = false;
        this._resumePosition = -1;
        this._defaultAudioScaledDuration = 0;
        this._defaultVideoScaledDuration = 0;
    }

    _isInitialMetadataDispatched() {
        if (this._hasAudio && this._hasVideo) {  // both audio & video
            return this._audioInitialMetadataDispatched && this._videoInitialMetadataDispatched;
        }
        if (this._hasAudio && !this._hasVideo) {  // audio only
            return this._audioInitialMetadataDispatched;
        }
        if (!this._hasAudio && this._hasVideo) {  // video only
            return this._videoInitialMetadataDispatched;
        }
        return false;
    }

    _processMediaInfo() {
        let tracks = this._segmentTracks;
        let info = this._segmentInfo;
        let cues = this._segmentCues;

        for (let i = 0; i < tracks.length; i++) {
            let track = tracks[i];
            if (track.video && !this._defaultVideoTrack) {
                this._defaultVideoTrack = track;
            } else if (track.audio && !this._defaultAudioTrack) {
                this._defaultAudioTrack = track;
            } else {
                Log.w(this.TAG, `Found ${track.type} track, ignoring.`);
                continue;
            }
        }

        let mediaInfo = this._mediaInfo;
        mediaInfo.mimeType = 'video/mp4';
        mediaInfo.metadata = {
            duration: info.duration * info.timecodeScale / 1e6
        };
        mediaInfo.duration = this._duration;
        mediaInfo.hasVideo = this._hasVideo = this._defaultVideoTrack !== null;
        if (this._defaultVideoTrack.codecID !== 'V_MPEG4/ISO/AVC') {
            throw new IllegalStateException(`${this.TAG} unsupport video codec ${this._defaultVideoTrack.codecID}`);
        }
        mediaInfo.hasAudio = this._hasAudio = this._defaultAudioTrack !== null;
        if (this._defaultAudioTrack.codecID !== 'A_AAC') {
            if (this._defaultAudioTrack.codecID === 'A_FLAC' && window.MediaSource.isTypeSupported('audio/mp4; codecs="flac"')) {
                Log.i(this.TAG, 'find flac audio try to use');
            } else {
                Log.w(this.TAG, `unsupport audio codec ${this._defaultAudioTrack.codecID} audio will be disabled`);
                mediaInfo.hasAudio = false;
                this._defaultAudioTrack = null;
            }
        }
        let codecs = [];
        let id = 1;

        // !! if video track id bigger than audio track id will crash
        let timeScale = 1e9 / info.timecodeScale;//store in n nanoseconds
        if (mediaInfo.hasVideo) {
            let avcC = this._parseAvcCData(this._defaultVideoTrack.codecPrivate);
            let sps = avcC.SPS[0];
            mediaInfo.videoCodec = sps.codecString;
            codecs.push(mediaInfo.videoCodec);

            //mediaInfo.videoDataRate = size / mediaInfo.metadata.duration * 8;
            mediaInfo.width = sps.present_size.width;
            mediaInfo.height = sps.present_size.height;
            mediaInfo.fps = sps.frame_rate.fps;
            mediaInfo.profile = sps.profile_string;
            mediaInfo.level = sps.level_string;
            mediaInfo.chromaFormat = sps.chroma_format_string;
            mediaInfo.sarNum = sps.sar_ratio.width;
            mediaInfo.sarDen = sps.sar_ratio.height;
            mediaInfo.refFrames = sps.ref_frames;

            mediaInfo.hasKeyframesIndex = false;
            mediaInfo.keyframesIndex = null;

            if (cues) {
                let times = [];// in miliseconds
                let filepositions = []; // because no cluster size info so give cluster start position
                for (let i = 0, len = cues.length, cue = null; i < len; i++) {
                    cue = cues[i];
                    if (typeof cue.time !== 'undefined' && cue.trackPositions && cue.trackPositions.length) {
                        times.push(Math.round(this._timestampBase + cue.time * 1e3 / timeScale));
                        filepositions.push(cue.trackPositions[0].clusterPosition + this._seekHeaderOffset);
                    }
                }
                mediaInfo.hasKeyframesIndex = true;
                mediaInfo.keyframesIndex = {times: times, filepositions: filepositions};
            }

            this._naluLengthSize = avcC.lengthSizeMinusOne + 1;
            if (this._naluLengthSize !== 3 && this._naluLengthSize !== 4) {
                this._onError(DemuxErrors.FORMAT_ERROR, `Mp4: Strange NaluLengthSizeMinusOne: ${this._naluLengthSize - 1}`);
                return;
            }

            let meta = {};
            meta.avcc = avcC.data;
            meta.bitDepth = sps.bit_depth;
            meta.chromaFormat = sps.chroma_format;
            meta.codec = mediaInfo.videoCodec;
            meta.codecHeight = sps.codec_size.height;
            meta.codecWidth = sps.codec_size.width;
            meta.duration = (this._duration / 1e3 * timeScale) | 0;
            meta.timescale = timeScale;
            meta.frameRate = sps.frame_rate;
            meta.id = id++;
            meta.level = sps.level_string;
            meta.presentHeight = sps.present_size.height;
            meta.presentWidth = sps.present_size.width;
            meta.profile = sps.profile_string;
            meta.refSampleDuration = meta.timescale * (meta.frameRate.fps_den / meta.frameRate.fps_num);
            if (meta.refSampleDuration < 1) {
                Log.w(this.TAG, `uncommon video refSampleDuration ${meta.refSampleDuration} from timescale: ${meta.timescale} `
                    + `framerate: fixed ${meta.frameRate.fixed} fps ${meta.frameRate.fps} fps_num ${meta.frameRate.fps_num} fps_den ${meta.frameRate.fps_den}`);
                if (!this._defaultVideoTrack.defaultDuration) {
                    Log.w('video defaultDuration not found just use 24fps');
                    this._defaultVideoTrack.defaultDuration = Math.round(1e9 / 24);
                }
                meta.refSampleDuration = Math.round(this._defaultVideoTrack.defaultDuration / 1e9 * meta.timescale);
            }
            meta.sarRatio = sps.sar_ratio;
            meta.type = 'video';
            this._onTrackMetadata('video', meta);
            this._videoInitialMetadataDispatched = true;
            this._videoMetadata = meta;

            let videoScaledDuration = this._defaultVideoTrack.defaultDuration;
            if (videoScaledDuration) {
                videoScaledDuration = Math.round(this._defaultVideoTrack.defaultDuration / 1e9 * this._videoMetadata.timescale);
            } else {
                videoScaledDuration = Math.round(this._videoMetadata.refSampleDuration);
            }
            this._defaultVideoScaledDuration = videoScaledDuration;

        }
        if (mediaInfo.hasAudio) {
            let audioConfig = null;
            let bitDepth = 16;
            if (this._defaultAudioTrack.codecID === 'A_AAC') {
                let specDesc = this._parseEsdsData(this._defaultAudioTrack.codecPrivate);
                mediaInfo.audioCodec = 'mp4a.40.' + specDesc.originalAudioObjectType;
                codecs.push(mediaInfo.audioCodec);
                mediaInfo.audioSampleRate = this._mpegSamplingRates[specDesc.samplingIndex];
                mediaInfo.audioChannelCount = specDesc.channelConfig;
                audioConfig = specDesc.data;
            } else {
                let specDesc = this._parseFlacConfigData(this._defaultAudioTrack.codecPrivate);
                mediaInfo.audioCodec = 'flac';
                codecs.push(mediaInfo.audioCodec);
                mediaInfo.audioSampleRate = specDesc.sampleRate;
                mediaInfo.audioChannelCount = specDesc.channelCount;
                audioConfig = specDesc.metadataBlocksData;
                bitDepth = specDesc.bitDepth;
            }

            //mediaInfo.audioDataRate = size / mediaInfo.metadata.duration * 8;
            let meta = {};
            meta.type = 'audio';
            meta.audioSampleRate = mediaInfo.audioSampleRate;
            meta.channelCount = mediaInfo.audioChannelCount;
            meta.bitDepth = bitDepth;
            meta.codec = mediaInfo.audioCodec;
            meta.originalCodec = meta.codec;
            meta.config = audioConfig;
            meta.duration = (this._duration / 1e3 * timeScale) | 0;
            meta.id = id++;
            meta.refSampleDuration = 1024 / meta.audioSampleRate * timeScale;
            meta.timescale = timeScale;
            this._onTrackMetadata('audio', meta);
            this._audioInitialMetadataDispatched = true;
            this._audioMetadata = meta;

            let audioScaledDuration = this._defaultAudioTrack.defaultDuration;
            if (audioScaledDuration) {
                audioScaledDuration = Math.round(this._defaultAudioTrack.defaultDuration / 1e9 * this._audioMetadata.timescale);
            } else {
                audioScaledDuration = Math.round(this._audioMetadata.refSampleDuration);
            }
            this._defaultAudioScaledDuration = audioScaledDuration;

        }
        mediaInfo.accurateDuration = mediaInfo.metadata.duration;
        if (codecs.length > 0) {
            mediaInfo.mimeType += '; codecs="' + codecs.join(',') + '"';
        }
        mediaInfo.bitrateMap = [];
        this._mediaInfo = mediaInfo;
        if (mediaInfo.isComplete())
            this._onMediaInfo(mediaInfo);
        Log.v(this.TAG, 'Parsed MediaInfo, hasVideo: ' + mediaInfo.hasVideo + ' hasAudio: ' + mediaInfo.hasAudio
            + ', accurate duration: ' + mediaInfo.accurateDuration);

        this._mediaInfoParsed = true;

    }

    _parseEsdsData(buffer) {
        let data = Array.from(new Uint8Array(buffer)); //make array because array concat method used in initial segment generation..
        let originalAudioObjectType = data[0] >>> 3;
        let samplingIndex = ((data[0] & 0x07) << 1) | (data[1] >>> 7);
        let channelConfig = (data[1] & 0x78) >>> 3;
        return {
            data,
            originalAudioObjectType,
            samplingIndex,
            channelConfig
        };
    }

    _parseFlacConfigData(buffer) {
        let data = new Uint8Array(buffer);
        let offset = 0;
        if (data[0] !== 0x66 || data[1] !== 0x4c || data[2] !== 0x61 || data[3] !== 0x43) {
            throw new IllegalStateException('"fLac" not set in flac config data');
        }
        offset += 4;

        let metadataBlocksData = buffer.slice(4, buffer.byteLength);
        let streamInfoFound = false;
        let blockSize = 0;
        while (!streamInfoFound) {
            let flag = data[offset++];
            let lastBlock = flag & 0x80;
            let blockType = flag & 0x7f;
            if (blockType === 0) { //streamInfo
                streamInfoFound = true;
            }
            blockSize = (data[offset++] << 16) + (data[offset++] << 8) + data[offset++];
            if (!streamInfoFound) {
                offset += blockSize;
            }

        }
        let minBlockSize = (data[offset++] << 8) + data[offset++];
        let maxBlockSize = (data[offset++] << 8) + data[offset++];
        let minFrameSize = (data[offset++] << 16) + (data[offset++] << 8) + data[offset++];
        let maxFrameSize = (data[offset++] << 16) + (data[offset++] << 8) + data[offset++];
        let s1 = data[offset++], s2 = data[offset++], s3 = data[offset++], s4 = data[offset++];
        let sampleRate = (s1 << 12) + (s2 << 4) + (s3 >> 4);
        let channelCount = (s3 >> 1) + 1;
        let bitDepth = ((s3 & 0x01) << 5) + (s4 >> 4) + 1;
        let totalSampleCount = (s4 & 0x0f) * 0x100000000 + (data[offset++] << 24)
            + (data[offset++] << 16) + (data[offset++] << 8) + data[offset++];
        let originmd5 = buffer.slice(offset, offset + 16);

        return {
            data,
            metadataBlocksData,
            minBlockSize,
            maxBlockSize,
            minFrameSize,
            maxFrameSize,
            sampleRate,
            channelCount,
            bitDepth,
            totalSampleCount,
            originmd5
        };
    }

    _parseAvcCData(buffer) {
        let body = new Uint8Array(buffer, 0, buffer.byteLength);
        let configurationVersion = body[0];
        let avcProfileIndication = body[1];
        let profile_compatibility = body[2];
        let AVCLevelIndication = body[3];
        let lengthSizeMinusOne = body[4] & 0x3;
        let nb_nalus = body[5] & 0x1f;
        let SPS = new Array(nb_nalus);
        let recordLength = body[6] * 255 + body[7];
        let offset = 8;
        for (let i = 0; i < nb_nalus; i++) {
            SPS[i] = SPSParser.parseSPS(new Uint8Array(buffer, offset, recordLength));
            let codecString = 'avc1.';
            let codecArray = body.subarray(offset + 1, offset + 4);
            for (let j = 0; j < 3; j++) {
                let h = codecArray[j].toString(16);
                if (h.length < 2) {
                    h = '0' + h;
                }
                codecString += h;
            }
            SPS[i].codecString = codecString;
            offset += recordLength;
        }
        nb_nalus = body[offset];
        let PPS = new Array(nb_nalus);
        offset++;
        for (let i = 0; i < nb_nalus; i++) {
            offset += 2;
            //ignoring PPS
            offset += recordLength;
        }
        return {
            configurationVersion,
            avcProfileIndication,
            profile_compatibility,
            AVCLevelIndication,
            lengthSizeMinusOne,
            SPS,
            data: body
        };
    }

    // function parseChunks(chunk: ArrayBuffer, byteStart: number): number;
    parseChunks(chunk, byteStart) {
        if (!this._onError || !this._onMediaInfo || !this._onTrackMetadata || !this._onDataAvailable) {
            throw new IllegalStateException('Flv: onError & onMediaInfo & onTrackMetadata & onDataAvailable callback must be specified');
        }

        let offset = 0;
        let le = this._littleEndian;
        let result = null;

        if (byteStart === 0) {
            result = _mkvParser.parseEBML(chunk, 0, chunk.byteLength);
            if (result.outerByteLength > chunk.byteLength || result[0] < 0) { //data not enough for EBML
                return 0;
            } else {
                offset += result.outerByteLength;
                this._segmentEndPos += offset;
                if (offset === chunk.byteLength) {
                    return offset;
                }
            }
        }

        if (!this._segmentOccured) {
            let flag = true;
            while (flag) {
                result = _mkvParser.parseTopElement(chunk, offset, chunk.byteLength - offset);
                if (result.name === 'Segment') {
                    break;
                }
                if (result.outerByteLength < 0 || offset + result.outerByteLength > chunk.byteLength) {
                    return offset;
                } else {
                    offset += result.outerByteLength;
                }
            }

            if (result.outerByteLength < 0) {
                return offset;
            } else {// Segment is very long which will meet end of file so just find its size
                this._segmentOccured = true;
                offset += result.readPos;
            }
        }

        if (!this._mediaInfoParsed) {
            if (this._seekForCues) {
                result = _mkvParser.parseTopElement(chunk, offset, chunk.byteLength - offset);
                if (result.outerByteLength < 0 || offset + result.outerByteLength > chunk.byteLength) {
                    return offset;
                } else {
                    if (result.name === 'Cues') {
                        this._parseCues(chunk, offset, byteStart);
                    }
                }
            } else {
                let flag = true;
                while (flag) {
                    result = _mkvParser.parseTopElement(chunk, offset, chunk.byteLength - offset);
                    if (result.outerByteLength < 0 || offset + result.outerByteLength > chunk.byteLength) {
                        return offset;
                    } else {
                        switch (result.name) {
                            case 'SeekHead':
                                this._parseSeekHead(chunk, offset, byteStart);
                                break;
                            case 'Info':
                                this._parseInfo(chunk, offset, byteStart);
                                break;
                            case 'Tracks':
                                this._parseTracks(chunk, offset, byteStart);
                                break;
                            case 'Cues':
                                this._parseCues(chunk, offset, byteStart);
                                break;
                            case 'Cluster':
                                flag = false;//find first Cluster data
                                break;
                        }
                        if (flag) {
                            offset += result.outerByteLength;
                        }
                    }
                }
            }

            if (this._segmentCues === null && this._seekHeaderTab !== null && this._seekHeaderTab['Cues']) {
                this._seekForCues = true;
                this._resumePosition = byteStart + offset;
                return this._seekHeaderTab['Cues'] + this._seekHeaderOffset - byteStart;
            }

            if (this._segmentInfo && this._segmentTracks) {
                this._processMediaInfo();
            }

            if (this._seekForCues) {
                this._seekForCues = false;
                let lastPos = this._resumePosition;
                this._resumePosition = -1;
                return lastPos - byteStart;
            }
        }

        // cluster data should read completely for now not support random access in one cluster
        let flag = true;
        while (flag) {
            result = _mkvParser.parseTopElement(chunk, offset, chunk.byteLength - offset);

            if (result.outerByteLength < 0 || offset + result.outerByteLength > chunk.byteLength) {
                break;
            } else {
                if (result.name === 'Cluster') {
                    this._parseClusterData(chunk, offset, byteStart);
                    this._lastClusterOffset = byteStart + offset + result.outerByteLength;
                }
                offset += result.outerByteLength;
            }
        }

        this._dispatch = true;
        // dispatch parsed frames to consumer (typically, the remuxer)
        if (this._isInitialMetadataDispatched()) {
            if (this._dispatch && (this._audioTrack.length || this._videoTrack.length)) {
                this._onDataAvailable(this._audioTrack, this._videoTrack);
            }
        }

        //throw new Error('test');
        // consumed bytes, just equals latest offset index
        // !! It MUST NOT be greater than chunk.byteLength otherwise iocontroller will give wrong data next time
        return offset;
    }

    _parseSeekHead(chunk, offset, byteStart) {
        let seek = this._seekHeaderTab;
        let length = chunk.byteLength - offset;
        if (!seek) {
            seek = _mkvParser.parseSeekHead(chunk, offset, length);
            if (seek.outerByteLength < 0 || seek.outerByteLength > length) {
                return;
            }

            let  seekObj = seek.seek;
            this._seekHeaderTab = seekObj.reduce(function (obj, item) {
                obj[item.name] = item.position;
                return obj;
            }, {});
            this._seekHeaderOffset = byteStart + offset;
        }
    }

    _parseInfo(chunk, offset) {
        this._segmentInfo = _mkvParser.parseInfo(chunk, offset, chunk.byteLength - offset).info;
    }

    _parseTracks(chunk, offset) {
        this._segmentTracks = _mkvParser.parseTracks(chunk, offset, chunk.byteLength - offset).tracks;
    }

    _parseCues(chunk, offset) {
        this._segmentCues = _mkvParser.parseCues(chunk, offset, chunk.byteLength - offset).cues;
    }

    _parseClusterData(chunk, offset, byteStart) {
        let cluster = _mkvParser.parseCluster(chunk, offset, chunk.byteLength - offset);
        let blocks = cluster.blocks;
        let track = null;

        let audioTrackNumber = 0;
        let videoTrackNumber = 0;
        let audioTimeBase = 0;
        let videoTimeBase = 0;
        if (this._defaultAudioTrack) {
            audioTimeBase = this._timestampBase / 1e3 * this._audioMetadata.timescale;
            audioTrackNumber = this._defaultAudioTrack.number;
        }

        if (this._defaultVideoTrack) {
            videoTimeBase = this._timestampBase / 1e3 * this._videoMetadata.timescale;
            videoTrackNumber = this._defaultVideoTrack.number;
        }

        let audioScaledDuration = this._defaultAudioScaledDuration;
        let videoScaledDuration = this._defaultVideoScaledDuration;

        let videoBlocks = [];
        let videoIndex = 0;
        let recordTimeScale = 1e9 / this._segmentInfo.timecodeScale;
        for (let i = 0, block = null; i < blocks.length; i++) {
            block = blocks[i];
            let ts = cluster.timecode + block.timecode;
            let frames = block.frames;
            if (block.trackNumber === audioTrackNumber) {
                track = this._audioTrack;
                let scaledDuration = audioScaledDuration;
                let timeBase = audioTimeBase;
                for (let i = 0, len = frames.length, lastSize = 0; i < len; i++) {
                    let pts = timeBase + ts + i * scaledDuration;
                    let frameOffset = offset + block.framesDataLocation + lastSize;
                    lastSize += frames[i].size;
                    let accData = new Uint8Array(chunk, frameOffset, frames[i].size);
                    let aacSample = { unit: accData, length: accData.byteLength, dts: pts, pts: pts };
                    track.samples.push(aacSample);
                    track.length += aacSample.length;
                }
                this._recordRealtimeBitrate((timeBase + ts) / recordTimeScale, block.framesDataLength);
            } else if (block.trackNumber === videoTrackNumber) {
                let scaledDuration = videoScaledDuration;
                let timeBase = videoTimeBase;
                block.index = videoIndex ++;
                block.pts = timeBase + ts;
                videoBlocks.push(block);
                this._recordRealtimeBitrate((timeBase + ts) / recordTimeScale, block.framesDataLength);
            }
        }

        if (videoBlocks.length > 0) {
            this._proccessVideoFrames(videoBlocks, videoScaledDuration, chunk, offset, byteStart);
        }
    }

    _proccessVideoFrames(blocks, defaultDuration, chunk, chunkOffset, byteStart) {

        let len = blocks.length;
        blocks.sort(function (a, b) {
            return a.timecode - b.timecode;
        });

        for (let i = len - 1; i > 0; i--) {
            blocks[i - 1].duration = blocks[i].pts - blocks[i - 1].pts;
        }

        let beginDts = this._lastVideoDts + defaultDuration;

        if (this._lastClusterOffset !== byteStart + chunkOffset) {
            // may seek happend
            beginDts = blocks[0].pts;
        }

        blocks.sort(function (a, b) {
            return a.index - b.index;
        });

        blocks[0].dts = beginDts;
        for (let i = 1; i < len; i++) {
            if (!blocks[i - 1].duration) {
                blocks[i - 1].duration = defaultDuration;
            }
            blocks[i].dts = blocks[i - 1].dts + blocks[i - 1].duration;
        }
        if (!blocks[blocks.length - 1].duration) {
            blocks[blocks.length - 1].duration = defaultDuration;
        }

        for (let i = 0; i < len; i++) {
            let block = blocks[i];
            let firstPts = blocks[i].pts;
            let firstDts = blocks[i].dts;
            let duration = blocks[i].duration;
            let frames = block.frames;
            if (!duration) {
                duration = defaultDuration;
            } else {
                duration = Math.round(duration / frames.length);
            }
            for (let i = 0, len = frames.length, lastSize = 0; i < len; i++) {
                let dts = firstDts + duration * i;
                let pts = firstPts + duration * i;
                let cts = pts - dts;
                let frameOffset = chunkOffset + block.framesDataLocation + lastSize;
                lastSize += frames[i].size;
                this._parseAVCVideoData(chunk, frameOffset, frames[i].size, byteStart + frameOffset, block.keyframe, pts, cts, duration);
                this._lastVideoDts = dts;
            }
        }
    }

    _parseAVCVideoData(arrayBuffer, dataOffset, dataSize, tagPosition, keyframe, pts, cts, duration) {
        let le = this._littleEndian;
        let v = new DataView(arrayBuffer, dataOffset, dataSize);

        let units = [], length = 0;

        let offset = 0;
        const lengthSize = this._naluLengthSize;
        let dts = pts - cts;

        while (offset < dataSize) {
            if (offset + 4 >= dataSize) {
                Log.w(this.TAG, `Malformed Nalu near timestamp ${dts}, offset = ${offset}, dataSize = ${dataSize}`);
                break;  // data not enough for next Nalu
            }
            // Nalu with length-header (AVC1)
            let naluSize = v.getUint32(offset, !le);  // Big-Endian read
            if (lengthSize === 3) {
                naluSize >>>= 8;
            }
            if (naluSize > dataSize - lengthSize) {
                Log.w(this.TAG, `Malformed Nalus near timestamp ${dts}, NaluSize > DataSize!`);
                return;
            }

            let unitType = v.getUint8(offset + lengthSize) & 0x1F;

            if (unitType === 5) {  // IDR
                keyframe = true;
            }

            let data = new Uint8Array(arrayBuffer, dataOffset + offset, lengthSize + naluSize);
            let unit = { type: unitType, data: data };
            units.push(unit);
            length += data.byteLength;

            offset += lengthSize + naluSize;
        }

        if (units.length) {
            let track = this._videoTrack;
            let avcSample = {
                units: units,
                length: length,
                duration: duration,
                isKeyframe: keyframe,
                dts: dts,
                cts: cts,
                pts: pts
            };
            if (keyframe) {
                avcSample.fileposition = tagPosition;
            }
            track.samples.push(avcSample);
            track.length += length;
        }
    }

    _recordRealtimeBitrate(time, dataDelta) {
        if (this._mediaInfo) {
            if (!this._mediaInfo.bitrateMap) {
                this._mediaInfo.bitrateMap = [];
            }

            let timeIndex = time < 1 ? 1 : Math.ceil(time);
            if (!this._mediaInfo.bitrateMap[timeIndex - 1]) {
                this._mediaInfo.bitrateMap[timeIndex - 1] = dataDelta * 8 / 1000;
            } else {
                this._mediaInfo.bitrateMap[timeIndex - 1] += dataDelta * 8 / 1000;
            }
        }
    }

}

export default MKVDemuxer;