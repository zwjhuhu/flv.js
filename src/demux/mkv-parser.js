import { MatroskaSpec } from './matroska-spec';
import Log from '../utils/logger.js';

const _textDecorder = (function () {

    if (typeof TextDecoder === 'function') {
        return new TextDecoder('utf-8');
    }

    return {
        'decode': function (arrBuf) {
            let utf8Arr = new Uint8Array(arrBuf);
            let utf16Str = '';

            for (let i = 0; i < utf8Arr.length; i++) {
                let one = utf8Arr[i].toString(2);
                let v = one.match(/^1+?(?=0)/);

                if (v && one.length == 8) {
                    let bytesLength = v[0].length;
                    let store = utf8Arr[i].toString(2).slice(7 - bytesLength);
                    for (let st = 1; st < bytesLength; st++) {
                        store += utf8Arr[st + i].toString(2).slice(2);
                    }
                    utf16Str += String.fromCharCode(parseInt(store, 2));
                    i += bytesLength - 1;
                } else {
                    utf16Str += String.fromCharCode(utf8Arr[i]);
                }
            }
            return utf16Str;
        }
    };
})();
class EBMLReader {
    static decodeString(arrBuf) {
        return _textDecorder.decode(arrBuf);
    }

    static countLeadingZeroes(b) {
        b = b & 0xFF;
        let mask = 0xFF;
        let count;
        for (count = 8; count >= 0; count--) {
            if ((b & mask) == 0) break;
            mask = (mask << 1) & 0xFF;
        }
        return count;
    }
}

class EBMLElement {

    constructor(buffer, offset, length, onlyTop = false) {
        this.dataView = new DataView(buffer, offset, length);
        this.readPos = 0;
        try {
            this.id = this.readId();
            this.innerByteLength = this.readLength();
        } catch (e) { //data may not enough for header
            this.outerByteLength = this.headerByteLength = -1;
            this.readPos = 0;
            return;
        }

        this.outerByteLength = this.readPos + this.innerByteLength;
        this.headerByteLength = this.readPos;

        this.type = MatroskaSpec.getType(this.id);
        this.name = MatroskaSpec.getName(this.id);

        if (this.dataView.byteLength < this.outerByteLength || onlyTop) {
            return;
        }

        switch (this.type) {
            case 'master':
            case 'container':
                this.childElements = this.readMaster();
                break;
            case 'uinteger':
                this.value = this.readUint();
                break;
            case 'integer':
                this.value = this.readInt();
                break;
            case 'float':
                this.value = this.readFloat();
                break;
            case 'string':
            case 'utf-8':
                this.value = this.readString();
                break;
            case 'binary':
                this.value = this.readBinary();
                break;
            case 'ebmlid':
                this.value = this.readId();
                break;
            default:
                break;
        }
        if (this.dataView.byteLength >= this.outerByteLength + 12) {
            this.readPos = this.outerByteLength;
            this.readId();
            this.nextOuterByteLength = this.readLength() + this.readPos - this.outerByteLength;
        }
        this.rawData = this.dataView.buffer.slice(offset, offset + this.outerByteLength);
    }

    destroy() {
        this.dataView = null;
        this.readPos = null;
    }

    getChildWithName(name) {
        if (!this.childElements) throw 'EBMLElement: Child elements not read';
        for (let i in this.childElements) {
            if (this.childElements[i].name == name) {
                return this.childElements[i];
            }
        }
    }

    filterChildrenWithName(name) {
        if (!this.childElements) throw 'EBMLElement: Child elements not read';
        let filterFunc = function (element) {
            if (element.name == name) return true;
            else return false;
        };
        return this.childElements.filter(filterFunc);
    }

    readLength() {
        let length = 0;
        length += EBMLReader.countLeadingZeroes(this.dataView.getUint8(this.readPos)) + 1;
        let result = 0;
        for (let i = 0; i < length; i++) {
            let read = this.dataView.getUint8(this.readPos + i);
            if (i == 0) read = read & (0xFF >> length);
            result *= 256;
            result += read;
        }
        this.readPos += length;
        return result;
    }


    readId() {
        let length = 0;
        length += EBMLReader.countLeadingZeroes(this.dataView.getUint8(this.readPos)) + 1;
        let result = '';
        for (let i = 0; i < length; i++) {
            let read = this.dataView.getUint8(this.readPos + i);
            //if (i == 0) read = read & (0xFF >> length);
            result += read.toString(16);
        }
        this.readPos += length;
        return '0x' + result.toUpperCase();
    }

    readInt() {
        let dataView = new DataView(this.dataView.buffer, this.dataView.byteOffset + this.readPos);
        let result = 0;
        if (dataView.getUint8(0) & 0x80) {
            for (let i = 0; i < this.innerByteLength; i++) {
                result *= 256;
                result += dataView.getUint8(i) ^ 0xFF;
            }
            return -(result + 1);
        } else {
            for (let i = 0; i < this.innerByteLength; i++) {
                result *= 256;
                result += dataView.getUint8(i);
            }
            return result;
        }
    }

    readUint() {
        let dataView = new DataView(this.dataView.buffer, this.dataView.byteOffset + this.readPos);
        let result = 0;
        for (let i = 0; i < this.innerByteLength; i++) {
            result *= 256;
            result += dataView.getUint8(i);
        }
        return result;
    }


    readFloat() {
        let dataView = new DataView(this.dataView.buffer, this.dataView.byteOffset + this.readPos);
        if (this.innerByteLength == 4) return dataView.getFloat32(0);
        else if (this.innerByteLength == 8) return dataView.getFloat64(0);
        else return NaN;
    }

    readString() {
        let arrayBuf = this.dataView.buffer.slice(this.dataView.byteOffset + this.headerByteLength, this.dataView.byteOffset + this.headerByteLength + this.innerByteLength);
        return EBMLReader.decodeString(arrayBuf);
    }


    readBinary() {
        return this.dataView.buffer.slice(this.dataView.byteOffset + this.headerByteLength, this.dataView.byteOffset + this.headerByteLength + this.innerByteLength);
    }

    readMaster() {
        return new EBMLElementList(this.dataView.buffer, this.dataView.byteOffset + this.readPos, this.innerByteLength);
    }

}


class EBMLElementList extends Array {
    constructor(buffer, offset, length) {
        super();
        this.dataView = new DataView(buffer, offset, length);
        this.readPos = 0;
        while (this.readPos < length) {
            let element = new EBMLElement(buffer, this.dataView.byteOffset + this.readPos, length - this.readPos);
            element.relativeOffset = this.readPos;
            this.readPos += element.outerByteLength;
            this.push(element);
        }
    }

    destroy() {
        this.dataView = null;
        this.readPos = null;
        super.destroy();
    }

}


class MKVParser {

    constructor() {
        this.TAG = 'MKVParser';
    }

    isMatroska(buffer, offset, length) {
        let firstElement = new EBMLElement(buffer, offset, length);
        if (firstElement.name != 'EBML') {
            Log.v(this.TAG, 'first element in file is not "EBML"');
            return false;
        }
        if (!firstElement.childElements) {
            Log.v(this.TAG, 'EBML header is unusually large.');
            return false;
        }
        for (let i in firstElement.childElements) {
            if (firstElement.childElements[i].name == 'DocType') {
                if (firstElement.childElements[i].value == 'matroska') {
                    return true;
                }
            }
        }
        Log.v(this.TAG, 'Could not find DocType "matroska"');
        return false;
    }

    isWebm(buffer, offset, length) {
        let firstElement = new EBMLElement(buffer, offset, length);
        if (firstElement.name != 'EBML') {
            Log.v(this.TAG, 'first element in file is not "EBML"');
            return false;
        }
        if (!firstElement.childElements) {
            Log.v(this.TAG, 'EBML header is unusually large.');
            return false;
        }
        for (let i in firstElement.childElements) {
            if (firstElement.childElements[i].name == 'DocType') {
                if (firstElement.childElements[i].value == 'webm') {
                    return true;
                }
            }
        }
        Log.v(this.TAG, 'Could not find DocType "webm"');
        return false;
    }

    parseTopElement(buffer, offset, length) {
        let element = new EBMLElement(buffer, offset, length, true);
        return element;
    }

    parseEBML(buffer, offset, length) {
        return new EBMLElement(buffer, offset, length, false);
    }

    parseSeekHead(buffer, offset, length) {
        let seekHeadElement = new EBMLElement(buffer, offset, length, true);
        if (seekHeadElement.outerByteLength <= length) {
            seekHeadElement = new EBMLElement(buffer, offset, length, false);
            let seekHeadElements = seekHeadElement.childElements;
            let seekObject = {outerByteLength: seekHeadElement.outerByteLength};
            let seek = [];
            for (let i in seekHeadElements) {
                let a = seekHeadElements[i];
                if (a.name !== 'Seek')
                    continue;
                let elementName = null;
                let elementPosition = null;
                for (let j in a.childElements) {
                    let b = a.childElements[j];
                    if (b.name === 'SeekID') {
                        elementName = MatroskaSpec.getName(b.value);
                    } else if (b.name === 'SeekPosition') {
                        elementPosition = b.value;
                    }
                }
                if (typeof elementName === 'string' && typeof elementPosition === 'number') {
                    seek.push({name: elementName, position: elementPosition});
                }
            }
            seekObject.seek = seek;
            return seekObject;
        } else {
            return seekHeadElement;
        }
    }

    parseInfo(buffer, offset, length) {
        let infoElement = new EBMLElement(buffer, offset, length, false);
        if (infoElement.outerByteLength > length || infoElement.outerByteLength < 0) {
            return infoElement;
        }
        if (infoElement.name != 'Info')
            throw new Error('SeekHead entry for Info does not point to an Info element.');

        let infoObject = {outerByteLength: infoElement.outerByteLength};
        let info = {};
        let ret = infoElement.getChildWithName('TimecodeScale');
        if (ret)
            info.timecodeScale = ret.value;
        ret = infoElement.getChildWithName('Duration');
        if (ret)
            info.duration = ret.value;
        ret = infoElement.getChildWithName('Title');
        if (ret)
            info.title = ret.value;
        info.rawData = infoElement.rawData;
        infoObject.info = info;
        return infoObject;
    }

    //just read not process
    parseChapters(buffer, offset, length) {
        return this._parseTopElement(buffer, offset, length);
    }

    parseTracks(buffer, offset, length) {
        let tracksElement = new EBMLElement(buffer, offset, length, false);
        if (tracksElement.outerByteLength > length || tracksElement.outerByteLength < 0) {
            return tracksElement;
        }
        if (tracksElement.name != 'Tracks')
            throw new Error('SeekHead entry for Tracks does not point to an Tracks element.');

        let tracksObject = {outerByteLength: tracksElement.outerByteLength, rawData: tracksElement.rawData};
        let tracks = [];
        let trackTypeMapping = { 1: 'video', 2: 'audio', 3: 'complex', 0x10: 'logo', 0x11: 'subtitle', 0x12: 'buttons', 0x20: 'control' };
        for (let i in tracksElement.childElements) {
            let track = tracksElement.childElements[i];
            if (track.name != 'TrackEntry') continue;
            let t = {};
            let a;
            a = track.getChildWithName('TrackNumber');
            if (a) t.number = a.value;
            a = track.getChildWithName('TrackUID');
            if (a) t.uid = a.value;
            a = track.getChildWithName('TrackType');
            if (a) t.type = trackTypeMapping[a.value];
            a = track.getChildWithName('FlagEnabled');
            if (a) t.flagEnabled = Boolean(a.value);
            a = track.getChildWithName('FlagDefault');
            if (a) t.flagDefault = Boolean(a.value);
            a = track.getChildWithName('FlagForced');
            if (a) t.flagForced = Boolean(a.value);
            a = track.getChildWithName('FlagLacing');
            if (a) t.flagForced = Boolean(a.value);
            a = track.getChildWithName('MinCache');
            if (a) t.minCache = a.value;
            a = track.getChildWithName('MaxBlockAdditionID');
            if (a) t.maxBlockAdditionID = a.value;
            a = track.getChildWithName('Name');
            if (a) t.name = a.value;
            a = track.getChildWithName('Language');
            if (a) t.language = a.value;
            a = track.getChildWithName('CodecID');
            if (a) t.codecID = a.value;
            a = track.getChildWithName('CodecPrivate');
            if (a) t.codecPrivate = a.value;
            a = track.getChildWithName('SeekPreRoll');
            if (a) t.seekPreRoll = a.value;
            a = track.getChildWithName('DefaultDuration');
            if (a) t.defaultDuration = a.value;

            a = track.getChildWithName('Video');
            if (a) {
                let video = {};
                let b;
                b = a.getChildWithName('FlagInterlaced');
                if (b) video.flagInterlaced = Boolean(b.value);
                b = a.getChildWithName('StereoMode');
                if (b) video.stereoMode = b.value;
                b = a.getChildWithName('AlphaMode');
                if (b) video.alphaMode = b.value;
                b = a.getChildWithName('PixelWidth');
                if (b) video.pixelWidth = b.value;
                b = a.getChildWithName('PixelHeight');
                if (b) video.pixelHeight = b.value;
                b = a.getChildWithName('PixelCrop');
                if (b) video.pixelCrop = b.value;
                b = a.getChildWithName('PixelCropBottom');
                if (b) video.pixelCropBottom = b.value;
                b = a.getChildWithName('PixelCropTop');
                if (b) video.pixelCropTop = b.value;
                b = a.getChildWithName('PixelCropLeft');
                if (b) video.pixelCropLeft = b.value;
                b = a.getChildWithName('DisplayWidth');
                if (b) video.displayWidth = b.value;
                b = a.getChildWithName('DisplayHeight');
                if (b) video.displayHeight = b.value;
                b = a.getChildWithName('DisplayUnit');
                if (b) video.displayUnit = b.value;
                b = a.getChildWithName('ColourSpace');
                if (b) video.colourSpace = b.value;
                t.video = video;
            }
            a = track.getChildWithName('Audio');
            if (a) {
                let audio = {};
                let b;
                b = a.getChildWithName('SamplingFrequency');
                if (b) audio.samplingFrequency = b.value;
                b = a.getChildWithName('OutputSamplingFrequency');
                if (b) audio.outputSamplingFrequency = b.value;
                b = a.getChildWithName('Channels');
                if (b) audio.channels = b.value;
                b = a.getChildWithName('BitDepth');
                if (b) audio.bitDepth = b.value;
                t.audio = audio;
            }
            a = track.getChildWithName('ContentEncodings');
            if (a) t.contentEncoding = true;
            t.rawData = track.rawData;
            tracks.push(t);
        }
        tracksObject.tracks = tracks;
        return tracksObject;
    }


    parseCues(buffer, offset, length) {
        let cuesElement = new EBMLElement(buffer, offset, length, false);
        if (cuesElement.outerByteLength > length || cuesElement.outerByteLength < 0) {
            return cuesElement;
        }
        if (cuesElement.name != 'Cues')
            throw new Error('SeekHead entry for Cues does not point to a Cues element.');

        let cuesObject = {outerByteLength: cuesElement.outerByteLength};
        let cues = [];
        for (let i in cuesElement.childElements) {
            let cue = cuesElement.childElements[i];
            if (cue.name != 'CuePoint') continue;
            let p = {};
            let a;
            a = cue.getChildWithName('CueTime');
            if (a) p.time = a.value;
            p.trackPositions = [];
            for (let i in cue.childElements) {
                a = cue.childElements[i];
                if (a.name != 'CueTrackPositions') continue;
                let b;
                let tp = {};
                b = a.getChildWithName('CueTrack');
                if (b) tp.track = b.value;
                b = a.getChildWithName('CueClusterPosition');
                if (b) tp.clusterPosition = b.value;
                b = a.getChildWithName('CueRelativePosition');
                if (b) tp.relativePosition = b.value;
                b = a.getChildWithName('CueDuration');
                if (b) tp.duration = b.value;
                p.trackPositions.push(tp);
            }
            cues.push(p);
        }
        cuesObject.cues = cues;
        return cuesObject;
    }

    parseCluster(buffer, offset, length) {

        let element = new EBMLElement(buffer, offset, length, true);
        if (element.outerByteLength > length || element.outerByteLength < 0) {
            return element;
        }
        element = new EBMLElement(buffer, offset, length, false);
        let clusterTimecode;
        let sbes = [];
        for (let i in element.childElements) {
            if (element.childElements[i].name == 'Timecode') {
                clusterTimecode = element.childElements[i].value;
                break;
            }
        }
        if (typeof clusterTimecode === 'number') {
            for (let i in element.childElements) {
                if (element.childElements[i].name == 'SimpleBlock') {
                    let sbe = element.childElements[i];
                    let block = this._readSimpleBlock(sbe.value);
                    block.content = sbe.value;
                    block.rawData = sbe.rawData;
                    block.framesDataLocation = element.headerByteLength + sbe.relativeOffset + sbe.headerByteLength + block.framesDataOffset;
                    sbes.push(block);
                } else if (element.childElements[i].name == 'BlockGroup') {

                    let bgElem = element.childElements[i];
                    let block = null;
                    let keyframe = true;
                    for (let j = 0, elen = bgElem.childElements.length; j < elen; j++) {
                        if (bgElem.childElements[j].name === 'Block') { //may have more than one ? just process first one make it like simpleblock
                            let be = bgElem.childElements[j];
                            block = this._readSimpleBlock(be.value); //Block structure similar to SimpleBlock just without keyframe flag
                            block.blockGroup = true;
                            block.content = be.value;
                            block.rawData = null;//leave rawData null have to create later manually if neccssary;
                            block.framesDataLocation = element.headerByteLength + bgElem.relativeOffset + bgElem.headerByteLength
                                + be.relativeOffset + be.headerByteLength + block.framesDataOffset;
                        } else if (bgElem.childElements[j].name === 'ReferenceBlock') {
                            keyframe = false;
                        }
                    }
                    block.keyframe = keyframe;
                    sbes.push(block);
                }
            }
        }
        let cluster = {outerByteLength: element.outerByteLength, rawData: element.rawData};
        cluster.timecode = clusterTimecode;
        cluster.blocks = sbes;
        return cluster;

    }

    _readTrackNumber(dataView) {
        let length = 0, readPos = 0;
        length += EBMLReader.countLeadingZeroes(dataView.getUint8(readPos)) + 1;
        let result = 0;
        for (let i = 0; i < length; i++) {
            let read = dataView.getUint8(readPos + i);
            if (i == 0) read = read & (0xFF >> length);
            result *= 256;
            result += read;
        }
        readPos += length;
        return [result, readPos];
    }

    _readEbmlLacingFrameSize(dataView, offset, preSize) {


        let length = 0;
        length += EBMLReader.countLeadingZeroes(dataView.getUint8(offset)) + 1;
        let result = 0;
        for (let i = 0; i < length; i++) {
            let read = dataView.getUint8(offset + i);
            if (i == 0) read = read & (0xFF >> length);
            result *= 256;
            result += read;
        }
        let size = result;
        if (preSize > 0) {
            let shiftNumber = (1 << (length * 8 - length - 1)) - 1;
            size = result - shiftNumber + preSize;
        }
        return [size, length];
    }

    _readSimpleBlock(arrayBuf) {

        let block = {};
        let d = new DataView(arrayBuf);
        let readPos = 0;
        [block.trackNumber, readPos] = this._readTrackNumber(d);
        block.timecode = d.getInt16(readPos);
        readPos += 2;
        let flags = d.getUint8(readPos);
        readPos += 1;
        block.keyframe = Boolean(flags & 0x80);
        block.invisible = Boolean(flags & 0x08);
        block.lacing = flags & 0x06;
        block.discardable = Boolean(flags & 0x01);
        let frames = [];
        let frame = null;
        let frameCount = 0;
        let size = 0;
        let sum = 0;
        // lacing 00 : no lacing, 01 : Xiph lacing, 11 : EBML lacing, 10 : fixed-size lacing
        switch (block.lacing) {
            case 0:
                frame = {size: arrayBuf.byteLength - readPos};
                frames.push(frame);
                break;
            case 2:
                frameCount = d.getUint8(readPos++);//last frame size not count
                while (frameCount--) {
                    size = 0;
                    let tmp = 0;
                    while (tmp === 0) {
                        tmp = d.getUint8(readPos++);
                        size += tmp;
                        if (tmp === 255) {
                            tmp = 0;
                        }
                    }
                    frame = {size: size};
                    frames.push(frame);
                    sum += size;
                }
                frame = {size: arrayBuf.byteLength - readPos - sum};
                frames.push(frame);
                break;
            case 4:
                frameCount = d.getUint8(readPos++);//last frame size not count
                frameCount ++;
                size = (arrayBuf.byteLength - readPos) / frameCount;
                while (frameCount--) {
                    frame = {size: size};
                    frames.push(frame);
                }
                break;
            case 6:
                frameCount = d.getUint8(readPos++);//last frame size not count
                {
                    let preSize = 0;
                    while (frameCount--) {
                        let [size, offset] = this._readEbmlLacingFrameSize(d, readPos, preSize);
                        frame = {size: size};
                        frames.push(frame);
                        preSize = size;
                        readPos += offset;
                        sum += size;
                    }
                }
                frame = {size: arrayBuf.byteLength - readPos - sum};
                frames.push(frame);
                break;
        }
        block.frames = frames;
        block.framesDataOffset = readPos;
        block.framesDataLength = arrayBuf.byteLength - readPos;
        return block;
    }

}

export default MKVParser;