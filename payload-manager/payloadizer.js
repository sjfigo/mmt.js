var MMTPayloadHeader = require('./mmt-payload-header.js');
var PayloadType = require('./payload-type.js');
var MPUDissolver = require('./../mpu-manager/mpu-dissolver.js');
var FragmentedMPUHeader = require('./fragmented-mpu-header.js');

class payloadizer {
    constructor () {
        this.payload_ = new MMTPayloadHeader();
        this.storedMPUcnt_ = 0;
        this.mpuList_ = [];
        this.payloadSetList_ = [];

        this.mpuDissolver = new MPUDissolver ();
    }

    payloadize (be_timed, use_mmtp, be_aggregate) { //timed(true) or non-timed(false), mmtp(true) or gfd(false)
        let i = 0;
        let j = 0;
        let mpu = null;
        let mpuFragCnt = 0;
        let fragmentSet = [];
        let mpuFragOffset = 0;
        if (this.mpuList_.length === 0) {
            return null;
        }

        mpu = this.mpuList_[0];
        // mpu parsing for only first mpu. parsed mpu is not stored.
        this.mpuDissolver.mpuData = mpu;
        let mpuFrags = this.mpuDissolver.mpuFragments;
        // set timed or non-timed
        // get mpu fragments
        // MPU > Fragment > payload > data unit
        mpuFragCnt = mpuFrags.length;
        for (i=0; i<mpuFragCnt; i++) {
            // get a mpu fragment
            let mpuFrag = mpuFrags[i];
            let mfuHeader = new FragmentedMPUHeader ();
            let mfuHeaderBuf = null;
            let payload = null;
            let fragment = null;
            
            // set Fragmented MPU Header
            this.payload_.length = mpuFrag.length;
            if (mpuFragCnt == 1) {
                this.payload_.type = 0x00; // Single complete MPU
            }
            else {
                this.payload_.type = 0x01; // MPU Fragment
            }
            this.payload_.fragmentationIndicator = 0x01;
            this.payload_.aggregationFlag = be_aggregate;
            this.payload_.randomAccessPointFlag = 0x01; // I-Frame
            this.payload_.mpuSequenceNumberFlag = 0x01;
            this.payload_.fragementCounter = mpuFragCnt;
            payload = this.payload_.make();

            mfuHeader.FT_ = mpuFrag.type;
            if (be_timed) {
                mfuHeader.setTimed();
                mfuHeader.movie_fragment_sequence_number = i;
                mfuHeader.sample_number = mpuFragCnt;
                mfuHeader.offset = mpuFragOffset;
                mfuHeader.priority = 255; // 0~255, 255 highest
                mfuHeader.dep_counter = 0; // ??? indicates the number of data units that depend on their media processing upon the media data in this MFU.
            }
            else {
                mfuHeader.setNonTimed();
                mfuHeader.item_ID = 0; // the identifier of the item that is carried as part of this MFU.
            }
            mfuHeaderBuf = mfuHeader.make();

            fragment = Buffer.allocUnsafe(payload.len + mfuHeaderBuf.length).fill(0x00);
            mfuHeaderBuf.copy(fragment, 0, 0, mfuHeaderBuf.length);
            payload.data.copy(fragment, mfuHeaderBuf.length, 0, payload.len);

            fragmentSet.push(fragment);

            mpuFragOffset += mpuFrag.length;
        }
        
        this.mpuList_.splice(0, 1);

        return fragmentSet;
    }
    set MPU (mpu) {
        this.mpuList_.push(mpu);
        this.storedMPUcnt_ ++;
    }
    get payloads () {
        let payloadSet = this.payloadSetList_[0];
        this.storedMPUcnt_ --;
        this.payloadSetList_.splice(0, 1);
        return payloadSet;
    }
}
module.exports = payloadizer;