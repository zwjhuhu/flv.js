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

/**
 * Firefox: some files may play as well but may cause SourceBuffer become scattered
 *
 * some tips:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1240201
 * the time between two webm blocks do not match the sum of the samples in those blocks.
 * So this cause the buffered range reported to no be continuous:
 * example: expected "{ [0.000, 6.050) }"
 * but got "{ [0.013, 0.384) [0.408, 0.779) [0.803, 2.381) [2.405, 3.565) [3.589, 3.960) [3.984, 4.378) [4.402, 5.562) [5.586, 5.957) [5.981, 6.050) }
 *
 */
class WEBMDemuxer {

    constructor(probeData, config) {
        this.TAG = 'WEBMDemuxer';

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
        this._fileHeaderRawData = null;

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
        let isMatch = _mkvParser.isWebm(buffer, 0, buffer.byteLength);
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
        mediaInfo.mimeType = 'video/webm';
        mediaInfo.metadata = {
            duration: info.duration * info.timecodeScale / 1e6
        };
        mediaInfo.duration = this._duration;
        mediaInfo.hasVideo = this._hasVideo = this._defaultVideoTrack !== null;
        mediaInfo.hasAudio = this._hasAudio = this._defaultAudioTrack !== null;

        let bitrateMapTrack = {};
        let maxDuration = 0;
        let chunkMap = {};
        let sampleTsMap = {};
        let codecs = [];
        let id = 1;
        let accurateDuration = [0];
        let timeScale = 1e9 / info.timecodeScale;//store in n nanoseconds

        if (mediaInfo.hasVideo) {
            let videoCodec = this._defaultVideoTrack.codecID === 'V_VP9' ? 'vp9' : 'vp8';
            mediaInfo.videoCodec = videoCodec;
            codecs.push(mediaInfo.videoCodec);

            //mediaInfo.videoDataRate = size / mediaInfo.metadata.duration * 8;
            mediaInfo.width = this._defaultVideoTrack.video.pixelWidth;
            mediaInfo.height = this._defaultVideoTrack.video.pixelHeight;
            mediaInfo.fps = Math.ceil(1e9 / this._defaultVideoTrack.defaultDuration);
            mediaInfo.profile = 'unknown';
            mediaInfo.level = 'unknown';
            mediaInfo.chromaFormat = 'unknown';
            mediaInfo.sarNum = mediaInfo.width;
            mediaInfo.sarDen = mediaInfo.height;
            mediaInfo.refFrames = 1;

            mediaInfo.hasKeyframesIndex = false;
            mediaInfo.keyframesIndex = null;

            if (cues) {
                let times = [];// in miliseconds
                let filepositions = []; // because no cluster size info so give cluster start position
                for (let i = 0, len = cues.length, cue = null; i < len; i++) {
                    cue = cues[i];
                    if (typeof cue.time !== 'undefined' && cue.trackPositions && cue.trackPositions.length) {
                        times.push(Math.round(this._timestampBase + cue.time * 1e3 / timeScale));
                        let fileposition = cue.trackPositions[0].clusterPosition + this._seekHeaderOffset;
                        filepositions.push(fileposition);
                    }
                }
                mediaInfo.hasKeyframesIndex = true;
                mediaInfo.keyframesIndex = {times: times, filepositions: filepositions};
            }

            let meta = {};
            //meta.avcc = avcC.data;
            //meta.bitDepth = sps.bit_depth;
            //meta.chromaFormat = sps.chroma_format;
            meta.codec = mediaInfo.videoCodec;
            //meta.codecHeight = sps.codec_size.height;
            //meta.codecWidth = sps.codec_size.width;
            meta.duration = (this._duration / 1e3 * timeScale) | 0;
            meta.timescale = timeScale;
            meta.frameRate = mediaInfo.fps;
            meta.id = this._defaultVideoTrack.number;
            //meta.level = sps.level_string;
            //meta.presentHeight = sps.present_size.height;
            //meta.presentWidth = sps.present_size.width;
            //meta.profile = sps.profile_string;
            meta.refSampleDuration = Math.round(this._defaultVideoTrack.defaultDuration / 1e9 * meta.timescale);
            //meta.sarRatio = sps.sar_ratio;
            meta.type = 'video';
            meta.rawDatas = {
                fileHeader: this._fileHeaderRawData,
                track: this._defaultVideoTrack.rawData
            };
            this._onTrackMetadata('video', meta);
            this._videoInitialMetadataDispatched = true;
            this._videoMetadata = meta;
        }
        if (mediaInfo.hasAudio) {
            //let specDesc = this._parseEsdsData(this._defaultAudioTrack.codecPrivate);
            let audioCodec = this._defaultAudioTrack.codecID === 'A_OPUS' ? 'opus' : 'vorbits';
            mediaInfo.audioCodec = audioCodec;
            codecs.push(mediaInfo.audioCodec);
            mediaInfo.audioSampleRate = this._defaultAudioTrack.audio.samplingFrequency;
            mediaInfo.audioChannelCount = this._defaultAudioTrack.audio.channels;

            //mediaInfo.audioDataRate = size / mediaInfo.metadata.duration * 8;
            let meta = {};
            meta.type = 'audio';
            meta.audioSampleRate = mediaInfo.audioSampleRate;
            meta.channelCount = mediaInfo.audioChannelCount;
            meta.codec = mediaInfo.audioCodec;
            meta.originalCodec = meta.codec;
            meta.config = this._defaultAudioTrack.codecPrivate;
            meta.duration = (this._duration / 1e3 * timeScale) | 0;
            meta.id = this._defaultAudioTrack.number;
            meta.refSampleDuration = 1024 / meta.audioSampleRate * timeScale;
            meta.timescale = timeScale;
            meta.rawDatas = {
                fileHeader: this._fileHeaderRawData,
                track: this._defaultAudioTrack.rawData
            };
            this._onTrackMetadata('audio', meta);
            this._audioInitialMetadataDispatched = true;
            this._audioMetadata = meta;

        }
        mediaInfo.accurateDuration = mediaInfo.metadata.duration;
        if (codecs.length > 0) {
            mediaInfo.mimeType += '; codecs="' + codecs.join(',') + '"';
        }

        mediaInfo.bitrateMap = [];
        mediaInfo.rawData = info.rawData;
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

    // function parseChunks(chunk: ArrayBuffer, byteStart: number): number;
    parseChunks(chunk, byteStart) {
        if (!this._onError || !this._onMediaInfo || !this._onTrackMetadata || !this._onDataAvailable) {
            throw new IllegalStateException('Webm: onError & onMediaInfo & onTrackMetadata & onDataAvailable callback must be specified');
        }

        let offset = 0;
        let le = this._littleEndian;
        let result = null;

        if (byteStart === 0) {
            result = _mkvParser.parseEBML(chunk, 0, chunk.byteLength);
            if (result.outerByteLength > chunk.byteLength || result[0] < 0) { //data not enough for EBML
                return 0;
            } else {
                this._fileHeaderRawData = result.rawData;
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
        this._dispatch = false;
        let clusterCount = 0;
        while (clusterCount >= 0) {
            result = _mkvParser.parseTopElement(chunk, offset, chunk.byteLength - offset);
            if (result.outerByteLength < 0 || offset + result.outerByteLength > chunk.byteLength) {
                break;
            } else {
                if (result.name === 'Cluster') {
                    this._parseClusterData(chunk, offset, byteStart);
                    this._lastClusterOffset = byteStart + offset + result.outerByteLength;
                    clusterCount++;
                }
                offset += result.outerByteLength;
            }
        }

        this._dispatch = clusterCount > 0;
        // dispatch parsed frames to consumer (typically, the remuxer)
        if (this._isInitialMetadataDispatched()) {
            if (this._dispatch && (this._audioTrack.length || this._videoTrack.length)) {
                this._onDataAvailable(this._audioTrack, this._videoTrack);
            }
        }

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

        let videoBlocks = [];
        let audioBlocks = [];
        let recordTimeScale = 1e9 / this._segmentInfo.timecodeScale;
        for (let i = 0, block = null; i < blocks.length; i++) {
            block = blocks[i];
            let ts = cluster.timecode + block.timecode;
            let frames = block.frames;
            if (block.trackNumber === audioTrackNumber) {
                let timeBase = audioTimeBase;
                audioBlocks.push(block);
                this._recordRealtimeBitrate((timeBase + ts) / recordTimeScale, block.framesDataLength);
            } else if (block.trackNumber === videoTrackNumber) {
                let timeBase = videoTimeBase;
                videoBlocks.push(block);
                this._recordRealtimeBitrate((timeBase + ts) / recordTimeScale, block.framesDataLength);
            }
        }

        if (videoBlocks.length) {
            track = this._videoTrack;
            track.samples.push({timecode: videoTimeBase + cluster.timecode, blocks: videoBlocks});
            track.length += 1;
        }

        if (audioBlocks.length) {
            track = this._audioTrack;
            track.samples.push({timecode: audioTimeBase + cluster.timecode, blocks: audioBlocks});
            track.length += 1;
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

export default WEBMDemuxer;