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

        buf = fragment.readUIntBE(iterator, 1);
        iterator += 1;
        mfuHeader.setFragmentType((buf & 0xFE) >> 1);
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

            mfuHeader.timedMediaPriority = fragment.readUIntBE(iterator, 1);
            iterator += 1;

            mfuHeader.timedMeidaDepCounter = fragment.readUIntBE(iterator, 1);
            iterator += 1;
        }

        return {data: mfuHeader, size: iterator - beginPoint};
    }

    decomposePayload (payloadData, beginPoint) {
        let payload = new MMTPayloadHeader();
        let iterator = beginPoint;
        let buf = null;

        payload.type = payloadData.readUIntBE(iterator, 1);
        iterator += 1;

        buf = payloadData.readUIntBE(iterator, 1);
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

        payload.fragmentCounter = payloadData.readUIntBE(iterator, 1);
        iterator += 1;

        while (iterator < payloadData.length) {
            let duLen = payloadData.readUInt16BE(iterator);
            iterator += 2;
            let du = Buffer.allocUnsafe(duLen).fill(0x00);
            du.copy(payloadData, iterator, 0, duLen);
            payload.setDataUnit(du, duLen);
            iterator += duLen;
        }

        return {data: payload, size: iterator};
    }
}
module.exports = depayloadizer;