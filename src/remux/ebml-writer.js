import { MatroskaSpec } from '../demux/matroska-spec';
import Log from '../utils/logger.js';


const _textEncoder = new TextEncoder('utf-8');
const _TAG = 'EBMLWriter';

class EBMLWriter {
    static findLeadingZeros(b) {
        let byteLen = EBMLWriter.findByteLength(b);
        let zeros = byteLen - 1;
        let prefix = 0x80 >> zeros;
        while (byteLen > 1) {
            b >>= 8;
            byteLen--;
        }
        if (b >= prefix) {
            zeros++;
        }
        return zeros;
    }

    static findByteLength(b) {// max support 8 byte length
        let len = 0;
        if (b === 0) {
            return 1;
        } else if (b > 0xffffffff) {
            len = 4;
            b = Math.floor(b / 0x100000000);
        }
        while (b) {
            b >>= 8;
            len++;
        }
        return len;
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

    static writeUintToBuf(num) {
        let str = num.toString(16);
        let length = str.length;
        if (length % 2) {
            length++;
            str = '0' + str;
        }
        length /= 2;
        let arr = new Uint8Array(length);
        for (let i = length - 1; i >= 0; i--) {
            arr[i] = parseInt('0x' + str.charAt(2 * i) + str.charAt(2 * i + 1));
        }
        return arr.buffer;
    }

    static writeIntToBuf(num) {
        let unum = num;
        if (num < 0) {
            unum = -num;
        }
        let temp = EBMLWriter.writeUintToBuf(unum);
        let length = temp.byteLength;
        let arr = null;
        if (num >= 0) {
            arr = new Uint8Array(temp);
            if (arr[0] >= 0x80) {
                length++;
                arr = new Uint8Array(length);
                EBMLWriter.copyArrBuf(temp, arr.buffer, 0, 1);
            }
        } else {
            arr = new Uint8Array(temp);
            if (arr[0] > 0x80) {
                length++;
                arr = new Uint8Array(length);
                EBMLWriter.copyArrBuf(temp, arr.buffer, 0, 1);
            } else if (arr[0] == 0x80) {
                for (let i = 1; i < length; i--) {
                    if (arr[i] > 0) {
                        length++;
                        break;
                    }
                }
            }
            for (let i = length - 1, plus = 1; i >= 0; i--) {
                arr[i] = ~arr[i] & 0xff;
                if (plus === 1) {
                    if (arr[i] === 0xff) {
                        arr[i] = 0;
                        plus = 1;
                    } else {
                        arr[i] += 1;
                        plus = 0;
                    }
                }
            }
        }
        return arr.buffer;
    }

    static copyArrBuf(srcBuf, destBuf, srcStart, destStart, length) {
        if (typeof length === 'undefined') {
            length = srcBuf.byteLength - srcStart;
        }
        let src = new Uint8Array(srcBuf);
        let dest = new Uint8Array(destBuf);
        for (let i = 0; i < length; i++) {
            dest[destStart + i] = src[srcStart + i];
        }
    }

    static getEBMLBytes(name, content, length = 0) {
        if (typeof name === 'undefined' || typeof content === 'undefined') {
            return null;
        }
        let sid = MatroskaSpec.getIdForName(name);
        let type = MatroskaSpec.getType(sid);
        let unkownLen = 0;

        if (name === 'Void') { // padding element
            let result = new Uint8Array(length + 9);
            result[0] = 0xec;
            result[1] = 0x01;
            let offset = 8;
            do {
                let byte = length & 0xFF;
                length = length >> 8;
                result[offset--] = byte;
            } while (length);
            return result.buffer;
        }

        if (length === -1) {
            unkownLen = 0xffffffff;
        }

        if (content instanceof ArrayBuffer) {
            length = content.byteLength;
            type = 'direct';
        }

        let id = parseInt(sid);
        let idLen = EBMLWriter.findByteLength(id);
        let lenLen = -1;


        let dataLen = 0;
        let contentArr = null;
        let contentView = null;
        switch (type) {
            case 'master':
            case 'container':
                if (typeof content === 'object' && !Array.isArray(content)) {
                    let temp = [];
                    for (let k in content) {
                        temp.push({name: k, content: content[k]});
                    }
                    content = temp;
                }
                if (Array.isArray(content) && content.length > 0) {
                    let initSize = 1024;
                    contentArr = new ArrayBuffer(initSize);
                    let subBuf = null;
                    length = 0;
                    for (let i = 0, len = content.length; i < len; i++) {
                        let child = content[i];
                        subBuf = EBMLWriter.getEBMLBytes(child.name, child.content, child.length);
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
                } else {
                    throw new Error('not support content' + content);
                }
                break;
            case 'uinteger':
            case 'ebmlid':
                contentArr = EBMLWriter.writeUintToBuf(content);
                length = contentArr.byteLength;
                break;
            case 'integer':
                contentArr = EBMLWriter.writeIntToBuf(content);
                length = contentArr.byteLength;
                break;
            case 'float':
                length = 8;
                contentArr = new ArrayBuffer(8);
                contentView = new DataView(contentArr);
                contentView.setFloat64(0, content);
                break;
            case 'string':
            case 'utf-8':
                contentArr = _textEncoder.encode(content).buffer;
                length = contentArr.byteLength;
                break;
            default:
                contentArr = content;
                break;
        }
        if (unkownLen > 0) {
            lenLen = 8;
            dataLen = length + idLen + lenLen;
            length = unkownLen;
        } else {
            lenLen = EBMLWriter.findLeadingZeros(length) + 1;
            dataLen = length + idLen + lenLen;
        }

        let uint8Arr = new Uint8Array(dataLen);

        let offset = idLen;
        let byte = 0;
        //set EBML id
        while (offset--) {
            byte = id & 0xFF;
            id = id >> 8;
            uint8Arr[offset] = byte;
        }

        //set EBML length
        let prefix = 0x80;
        offset = lenLen - 1;
        byte = 0;
        while (offset--) {
            prefix >>= 1;
        }
        offset = lenLen;
        while (offset--) {
            byte = length & 0xFF;
            length = length >>> 8;
            uint8Arr[offset + idLen] = byte;
        }
        uint8Arr[idLen] |= prefix;
        //set content
        EBMLWriter.copyArrBuf(contentArr, uint8Arr.buffer, 0, idLen + lenLen);

        return uint8Arr.buffer;
    }

    //only support trackNumber timecode
    static modifyBlockInfo(block, changes) {

        let arrayBuf = block.content;
        let newBuf = null;
        let d = new DataView(arrayBuf);
        let newTrackNumber = changes.trackNumber;
        let newTimecode = changes.timecode;
        let keyframe = changes.keyframe;
        let offset = 0;
        let diff = 0;
        let trackNumberBuf = null;
        let oldLen = EBMLWriter.countLeadingZeroes(d.getUint8(offset)) + 1;
        if (newTrackNumber && newTrackNumber !== block.trackNumber) {
            if (newTrackNumber <= 0) {
                Log.e(_TAG, `block trackNumber ${newTrackNumber} invalid`);
            } else {
                trackNumberBuf = EBMLWriter.writeUintToBuf(newTrackNumber);
                let newLen = trackNumberBuf.byteLength;
                diff = newLen - oldLen;
                block.trackNumber = newTrackNumber;
            }
        }
        offset += oldLen;
        if (newTimecode && newTimecode !== block.timecode) {
            newTimecode = Math.round(newTimecode);
            if (newTimecode > 32767 || newTimecode < -32768) {
                Log.e(_TAG, `block tiemcode ${newTimecode} invalid only accept int16 value`);
            } else {
                d.setInt16(offset, newTimecode);
                block.timecode = newTimecode;
            }
        }
        if (typeof keyframe !== 'undefined') {
            let flag = d.getUint8(offset + 2);
            flag = keyframe ? (flag | 0x80) : (flag & 0x0f);
            d.setUint8(offset + 2, flag);
            block.keyframe = keyframe;
        }
        if (trackNumberBuf) {
            EBMLWriter.copyArrBuf(trackNumberBuf, newBuf, 0, 0);
            EBMLWriter.copyArrBuf(arrayBuf, newBuf, offset, trackNumberBuf.byteLength);
            block.content = newBuf;
        }

        block.framesDataOffset += diff;
        return block;
    }
}

export default EBMLWriter;