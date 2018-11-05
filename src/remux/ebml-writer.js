import { MatroskaSpec } from '../demux/matroska-spec';
import Log from '../utils/logger.js';


const _textEncoder = new TextEncoder('utf-8');
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

    static findByteLength(b) {
        if (b === 0) {
            return 1;
        }
        let len = 0;
        while (b) {
            b >>= 8;
            len ++;
        }
        return len;
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

        if (name === 'Void') {// padding element
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
        //console.log(idLen);
        let lenLen = -1;


        let dataLen = 0;
        let contentArr = null;
        let contentView = null;
        switch (type) {
            case 'master':
            case 'container':
                if (Array.isArray(content) && content.length > 0) {
                    let initSize = 1024;
                    contentArr = new ArrayBuffer(initSize);
                    let subBuf = null;
                    length = 0;
                    for (let i = 0, len = content.length; i < len; i++) {
                        let child = content[i];
                        subBuf = EBMLWriter.getEBMLBytes(child.name, child.content, child.length);
                        if (length +  subBuf.byteLength > contentArr.byteLength) {
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
                {
                    length = 0;
                    let temp = content;
                    let nums = [];
                    while (temp) {
                        nums.unshift(temp % 256);
                        temp >>= 8;
                        length ++;
                    }
                    if (length === 0) {
                        length = 1;
                        nums = [0];
                    }
                    contentArr = new Uint8Array(length);
                    for (let i = 0; i < length; i++) {
                        contentArr[i] = nums[i];
                    }
                    contentArr = contentArr.buffer;
                }
                break;
            case 'integer':
                throw new Error('ssss');
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
        offset  = lenLen - 1;
        byte = 0;
        while (offset--) {
            prefix >>= 1;
        }
        offset  = lenLen;
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
}

export default EBMLWriter;