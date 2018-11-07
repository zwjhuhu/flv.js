/*
 * Copyright (C) 2016 Bilibili. All Rights Reserved.
 *
 * @author zheng qian <xqq@xqq.im>
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
import Browser from '../utils/browser.js';
import EBMLWriter from './ebml-writer.js';
import {SampleInfo, MediaSegmentInfo, MediaSegmentInfoList} from '../core/media-segment-info.js';
import {IllegalStateException} from '../utils/exception.js';


class WEBMRemuxer {

    constructor(config) {
        this.TAG = 'WEBMRemuxer';

        this._config = config;
        this._isLive = (config.isLive === true) ? true : false;

        this._dtsBase = -1;
        this._dtsBaseInited = false;
        this._audioDtsBase = Infinity;
        this._videoDtsBase = Infinity;
        this._audioNextDts = undefined;
        this._videoNextDts = undefined;
        this._audioStashedLastSample = null;
        this._videoStashedLastSample = null;

        this._audioMeta = null;
        this._videoMeta = null;

        this._audioSegmentInfoList = new MediaSegmentInfoList('audio');
        this._videoSegmentInfoList = new MediaSegmentInfoList('video');

        this._onInitSegment = null;
        this._onMediaSegment = null;

        // Workaround for chrome < 50: Always force first sample as a Random Access Point in media segment
        // see https://bugs.chromium.org/p/chromium/issues/detail?id=229412
        this._forceFirstIDR = (Browser.chrome &&
                              (Browser.version.major < 50 ||
                              (Browser.version.major === 50 && Browser.version.build < 2661))) ? true : false;

        // Workaround for IE11/Edge: Fill silent aac frame after keyframe-seeking
        // Make audio beginDts equals with video beginDts, in order to fix seek freeze
        this._fillSilentAfterSeek = (Browser.msedge || Browser.msie);

        // While only FireFox supports 'audio/mp4, codecs="mp3"', use 'audio/mpeg' for chrome, safari, ...
        this._mp3UseMpegAudio = !Browser.firefox;

        this._fillAudioTimestampGap = this._config.fixAudioTimestampGap;
    }

    destroy() {
        this._dtsBase = -1;
        this._dtsBaseInited = false;
        this._audioMeta = null;
        this._videoMeta = null;
        this._audioSegmentInfoList.clear();
        this._audioSegmentInfoList = null;
        this._videoSegmentInfoList.clear();
        this._videoSegmentInfoList = null;
        this._onInitSegment = null;
        this._onMediaSegment = null;
    }

    bindDataSource(producer) {
        producer.onDataAvailable = this.remux.bind(this);
        producer.onTrackMetadata = this._onTrackMetadataReceived.bind(this);
        return this;
    }

    /* prototype: function onInitSegment(type: string, initSegment: ArrayBuffer): void
       InitSegment: {
           type: string,
           data: ArrayBuffer,
           codec: string,
           container: string
       }
    */
    get onInitSegment() {
        return this._onInitSegment;
    }

    set onInitSegment(callback) {
        this._onInitSegment = callback;
    }

    /* prototype: function onMediaSegment(type: string, mediaSegment: MediaSegment): void
       MediaSegment: {
           type: string,
           data: ArrayBuffer,
           sampleCount: int32
           info: MediaSegmentInfo
       }
    */
    get onMediaSegment() {
        return this._onMediaSegment;
    }

    set onMediaSegment(callback) {
        this._onMediaSegment = callback;
    }

    insertDiscontinuity() {
        this._audioNextDts = this._videoNextDts = undefined;
    }

    seek(originalDts) {
        this._audioStashedLastSample = null;
        this._videoStashedLastSample = null;
        this._videoSegmentInfoList.clear();
        this._audioSegmentInfoList.clear();
    }

    remux(audioTrack, videoTrack) {
        if (!this._onMediaSegment) {
            throw new IllegalStateException('MP4Remuxer: onMediaSegment callback must be specificed!');
        }

        this._remuxVideo(videoTrack);
        this._remuxAudio(audioTrack);
    }

    _onTrackMetadataReceived(type, metadata) {
        let initSegData = null;

        let container = 'webm';
        let codec = metadata.codec;

        if (type === 'audio') {
            this._audioMeta = metadata;
            initSegData = this._generateInitSegment(metadata);
        } else if (type === 'video') {
            this._videoMeta = metadata;
            initSegData = this._generateInitSegment(metadata);
        } else {
            return;
        }

        // dispatch initSegData (Initialization Segment)
        if (!this._onInitSegment) {
            throw new IllegalStateException('MP4Remuxer: onInitSegment callback must be specified!');
        }
        this._onInitSegment(type, {
            type: type,
            data: initSegData,
            codec: codec,
            container: `${type}/${container}`,
            mediaDuration: Math.floor(metadata.duration * 1000 / metadata.timescale)  // in timescale 1000 (milliseconds)
        });
    }

    flushStashedSamples() {
        //do nothing
    }

    _remuxAudio(audioTrack) {
        if (this._audioMeta == null) {
            return;
        }

        let track = audioTrack;
        let samples = track.samples;

        let insertPrefixSilentFrame = false;

        if (!samples || samples.length === 0) {
            return;
        }

        track.samples = [];
        track.length = 0;
        let clusters = samples;

        let segment = {
            type: 'audio',
            data: this._generateClustersData(clusters),
            sampleCount: clusters.length
        };

        this._onMediaSegment('audio', segment);
    }

    _remuxVideo(videoTrack) {
        if (this._videoMeta == null) {
            return;
        }

        let track = videoTrack;
        let samples = track.samples;

        if (!samples || samples.length === 0) {
            return;
        }
        track.samples = [];
        track.length = 0;
        let clusters = samples;

        this._onMediaSegment('video', {
            type: 'video',
            data: this._generateClustersData(clusters),
            sampleCount: clusters.length
        });
    }

    _generateClustersData(clusters) {
        let length = 0;
        let contentArr = new ArrayBuffer(1024 * 1024);
        let result = null;
        let clusterData = null;
        for (let i = 0, len = clusters.length; i < len; i++) {
            let blockSumSize = 0;
            let block = null;
            for (let j = 0, bs = clusters[i].blocks.length; j < bs; j++) {
                block = clusters[i].blocks[j];
                if (block.blockGroup) { //recreate simpleblock data
                    block.rawData = EBMLWriter.getEBMLBytes('SimpleBlock', block.content);
                }
                blockSumSize += block.rawData.byteLength;
            }
            let tmpBuf = EBMLWriter.getEBMLBytes('Timecode', clusters[i].timecode);
            let clusterData = new ArrayBuffer(tmpBuf.byteLength + blockSumSize);
            EBMLWriter.copyArrBuf(tmpBuf, clusterData, 0, 0);
            for (let j = 0, bs = clusters[i].blocks.length, offset = tmpBuf.byteLength; j < bs; j++) {
                block = clusters[i].blocks[j];
                EBMLWriter.copyArrBuf(block.rawData, clusterData, 0, offset);
                offset += block.rawData.byteLength;
            }
            let subBuf = EBMLWriter.getEBMLBytes('Cluster', clusterData);
            if (length + subBuf.byteLength > contentArr.byteLength) {
                let nextLen = contentArr.byteLength * 2;
                if (length > nextLen) {
                    nextLen = length;
                }
                let nextArr = new ArrayBuffer(nextLen);
                EBMLWriter.copyArrBuf(contentArr, nextArr, 0, 0);
                contentArr = nextArr;
            }
            EBMLWriter.copyArrBuf(subBuf, contentArr, 0, length);

            length += subBuf.byteLength;

        }

        if (length < contentArr.byteLength) {
            contentArr = contentArr.slice(0, length);
        }

        return contentArr;
    }

    _generateInitSegment(metadata) {
        let fileheader = metadata.rawDatas.fileHeader;
        let trackData = metadata.rawDatas.track;
        let tracksData = EBMLWriter.getEBMLBytes('Tracks', trackData);

        let infoData = EBMLWriter.getEBMLBytes('Info', {
            'TimecodeScale': Math.round(1e9 / metadata.timescale),
            'Duration': metadata.duration * 1e3 / metadata.timescale
        });
        /*let seekPos = 100;
        let seekHeadData = EBMLWriter.getEBMLBytes('SeekHead', [
            {
                name: 'Seek',
                content: [
                    {name: 'SeekID', content: 0x1549a966},
                    {name: 'SeekPosition', content: seekPos}
                ]
            },
            {   name: 'Seek',
                content: [
                    {name: 'SeekID', content: 0x1654ae6b},
                    {name: 'SeekPosition', content: seekPos + infoData.byteLength}
                ]
            }
        ]);

        let voidData = EBMLWriter.getEBMLBytes('Void', null, 100 - seekHeadData.byteLength - 9);
        */
        let contentData = new ArrayBuffer(infoData.byteLength + tracksData.byteLength);
        let offset = 0;
        //EBMLWriter.copyArrBuf(seekHeadData, contentData, 0, offset);
        //offset += seekHeadData.byteLength;
        //EBMLWriter.copyArrBuf(voidData, contentData, 0, offset);
        //offset += voidData.byteLength;
        EBMLWriter.copyArrBuf(infoData, contentData, 0, offset);
        offset += infoData.byteLength;
        EBMLWriter.copyArrBuf(tracksData, contentData, 0, offset);
        let sigmentData = new DataView(EBMLWriter.getEBMLBytes('Segment', contentData, -1));
        let length = fileheader.byteLength + sigmentData.byteLength;
        let result = new ArrayBuffer(length);
        EBMLWriter.copyArrBuf(fileheader, result, 0, 0);
        EBMLWriter.copyArrBuf(sigmentData.buffer, result, 0, fileheader.byteLength);
        return result;
    }

}

export default WEBMRemuxer;