var FragmentedMPUHeader = require('./fragmented-mpu-header');
var MMTPayloadHeader = require('./mmt-payload-header');

class depayloadizer {
    constructor () {
        
    }

    depayloadize (payloadBuf) {
        let decomposedSet = null;
        let mfuHeader = null;
        let mfuHeaderSize = 0;
        let payload = null;
        let payloadSize = 0;
        let dataUnit = null;
        
        decomposedSet = this.decomposeMFUHeader(payloadBuf, 0);
        mfuHeader = decomposedSet.data;
        mfuHeaderSize = decomposedSet.size;

        decomposedSet = this.decomposePayload(payloadBuf, mfuHeaderSize);
        payload = decomposedSet.data;
        payloadSize = decomposedSet.size;

        dataUnit = {
            header: mfuHeader,
            headerSize: mfuHeaderSize,
            data: payload,
            dataSize: payloadSize
        };

        return dataUnit;
    }

    decomposeMFUHeader (fragment, beginPoint) {
        let mfuHeader = new FragmentedMPUHeader ();
        let buf = null;
        let iterator = beginPoint;

        buf = fragment.readUInt8BE(iterator);
        iterator += 1;
        mfuHeader.fragmentType((buf & 0xFE) >> 1);
        if (buf & 0x01) { // Non-timed media
            mfuHeader.setNonTimed();

            mfuHeader.nonTimedMediaItemID = fragment.readUInt32BE(iterator);
            iterator += 4;
        }
        else {
            mfuHeader.setTimed();

            mfuHeader.movieFragSeqNum = fragment.readUInt32BE(iterator);
            iterator += 4;

            mfuHeader.sampleNum = fragment.readUInt32BE(iterator);
            iterator += 4;

            mfuHeader.timedMediaOffset = fragment.readUInt16BE(iterator);
            iterator += 2;

            mfuHeader.timedMediaPriority = fragment.readUInt8BE(iterator);
            iterator += 1;

            mfuHeader.timedMeidaDepCounter = fragment.readUInt8BE(iterator);
            iterator += 1;
        }

        return {data: mfuHeader, size: iterator - beginPoint};
    }

    decomposePayload (payloadData, beginPoint) {
        let payload = new MMTPayloadHeader();
        let iterator = beginPoint;
        let buf = null;

        payload.type = payloadData.readUInt8BE(iterator);
        iterator += 1;

        buf = payloadData.readUInt8BE(iterator);
        iterator += 1;

        payload.fragmentationIndicator = (buf & 0xC0) >> 6;
        payload.aggregationFlag = (buf & 0x20) >> 5;
        payload.randomAccessPointFlag = (buf & 0x10) >> 4;
        payload.mpuSequenceNumberFlag = (buf & 0x08) >> 3;
        payload.S = (buf & 0x07);

        if (payload.mpuSequenceNumberFlag) {
            payload.mpuSequenceNumber = payloadData.readUInt32BE(iterator);
            iterator += 4;
        }

        payload.fragementCounter = payloadData.readUInt8BE(iterator);
        iterator += 1;

        if (payload.aggregationFlag) {
            // DU가 여러개...
        }
        else {
            payload.DU_length_ = payloadData.readUInt16BE(iterator);
            iterator += 2;
            payload.DU_Payload_ = Buffer.allocUnsafe(duLen).fill(0x00);
            payloadData.copy(payload.DU_Payload_, 0, iterator, iterator+duLen);
            iterator += duLen;
            //payload.DataUnit = {length: duLen, header or type ??: , payload: du};
        }

        return {data: payload, size: iterator};
    }
}
module.exports = depayloadizer;