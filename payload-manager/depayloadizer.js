var MPUFragment = require("./../mpu-manager/mmt-structure/mpu-fragment");
var FragmentedMPUHeader = require('./fragmented-mpu-header');
var MMTPayloadHeader = require('./mmt-payload-header');
var MPU_Fragment_Type = require("./../mpu-manager/mmt-structure/mpu-fragment-type");
var TimedMediaMFUHeader = require("./timed-media_MFU");
var NonTimedMediaMFUHeader = require("./non-timed_media_MFU");

class depayloadizer {
    constructor () {
        
    }

    depayloadize (payloadBuf) {
        let iterator = 0;
        let mpuFrag = new MPUFragment();

        let payload = this.decomposePayload(payloadBuf);
        
        let i = 0;
        let j = 0;
        let duLens = payload.data.DataUnitLengths;
        let dus = payload.data.DataUnitDatas;
        let duCnt = duLens.length;
        let totalDuSize = 0;
        for (i=0; i<duCnt; i++) {
            totalDuSize += duLens[i];
        }

        let duSet = Buffer.allocUnsafe(totalDuSize).fill(0x00);
        for (i=0; i<duCnt; i++) {
            if (dus[i] !== undefined) { // 왜 계속 17바이트???
                dus[i].copy(duSet, j, 0, duLens[i]);
            }
            j += duLens[i];
        }

        let fragmentMPUHeader = this.decomposeFragmentMPUHeader(duSet, iterator);
        mpuFrag.type = fragmentMPUHeader.fragmentType;
        iterator += fragmentMPUHeader.length;
        let timed = fragmentMPUHeader.isTimed();
        
        if (fragmentMPUHeader.fragmentType === MPU_Fragment_Type.MFU) {
            let mfuHeader = this.decomposeMFUHeader(payloadBuf, iterator, timed);
            if (timed === true) {
                mpuFrag.movie_fragment_sequence_number = mfuHeader.movie_fragment_sequence_number;
                mpuFrag.sample_number = mfuHeader.sample_number;
                mpuFrag.offset = mfuHeader.offset;
                mpuFrag.priority = mfuHeader.priority;
                mpuFrag.dep_counter = mfuHeader.dep_counter;
                iterator += mfuHeader.size;
            }
            else {
                mpuFrag.item_ID = mfuHeader.nonTimedMediaItemID;
                iterator += mfuHeader.size;
            }
        }

        mpuFrag.size = totalDuSize - iterator;
        mpuFrag.data = Buffer.allocUnsafe(mpuFrag.size).fill(0x00);
        duSet.copy(mpuFrag.data, 0, iterator, totalDuSize);

        return mpuFrag;
    }

    decomposeFragmentMPUHeader (fragment, beginPoint) {
        let fragmentMPUHeader = new FragmentedMPUHeader ();
        let fragmentMPUHeaderBuf = fragment.readUIntBE(beginPoint, fragmentMPUHeader.length);
        fragmentMPUHeader.fragmentType = fragmentMPUHeaderBuf >> 1;
        if (fragmentMPUHeaderBuf | 0x01) {
            fragmentMPUHeader.setTimed();
        }
        else {
            fragmentMPUHeader.setNonTimed();
        }
        return fragmentMPUHeader;
    }

    decomposeMFUHeader (fragment, beginPoint, timed) {
        let buf = null;
        let iterator = beginPoint;
        let mfuHeader = null;

        if (timed === false) { // Non-timed media
            mfuHeader = new NonTimedMediaMFUHeader();
            mfuHeader.nonTimedMediaItemID = fragment.readUInt32BE(iterator);
            iterator += 4;
        }
        else {
            mfuHeader = new TimedMediaMFUHeader();

            mfuHeader.movie_fragment_sequence_number = fragment.readUInt32BE(iterator);
            iterator += 4;

            mfuHeader.sample_number = fragment.readUInt32BE(iterator);
            iterator += 4;

            mfuHeader.offset = fragment.readUInt16BE(iterator);
            iterator += 2;

            mfuHeader.priority = fragment.readUIntBE(iterator, 1);
            iterator += 1;

            mfuHeader.dep_counter = fragment.readUIntBE(iterator, 1);
            iterator += 1;
        }

        return {data: mfuHeader, size: iterator - beginPoint};
    }

    decomposePayload (payloadData) {
        let payload = new MMTPayloadHeader();
        let iterator = 0;
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
            let duLen = payloadData.readUInt16BE(iterator); // 첫번째 len은 1233이 맞다 payload header 7byte + len이 써지는 2byte 해서 1242가 되어야 하는데 1248이 되고 있다.
            iterator += 2;
            let du = Buffer.allocUnsafe(duLen).fill(0x00);
            payloadData.copy(du, 0, iterator, iterator + duLen);
            payload.setDataUnit(du, duLen);
            iterator += duLen;
        }

        return {data: payload, size: iterator};
    }
}
module.exports = depayloadizer;