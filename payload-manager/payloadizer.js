var MMTPayloadHeader = require('./mmt-payload-header.js');
var DataUnitType = require('./du-type');

//MPU, MFU and Data Unit...

class payloadizer {
    /**
     * 
     * @param {*} be_timed : timed(true) or non-timed(false)
     * @param {*} use_mmtp : mmtp(true) or gfd(false)
     * @param {*} be_aggregate : aggregate(true) or not(false) -> Only use false
     */
    constructor (be_timed, use_mmtp, be_aggregate) {
        this.storedDUCnt_ = 0;
        this.duList_ = [];
        this.duListIterator_ = 0;
        this.duListLimit_ = 30;
        this.payloadList_ = [];
        this.payloadListIterator_ = 0;
        this.payloadListLimit_ = 100;

        this.be_timed = be_timed;
        this.use_mmtp = use_mmtp;
        this.be_aggregate = be_aggregate;
    }

    payloadize () { 
        let ret = false;
        let du = null;

        let payload = null;
        let payloadIterator = 0;
        let payloadHeader = new MMTPayloadHeader();
        let payloadHeaderObj = null;
        let duLenBuf = null;

        if (this.duList_.length < this.duListIterator_) {
            console.log("No Data unit")
            return ret;
        }

        du = this.duList_[this.duListIterator_];
        
        // set Payload Header
        payloadHeader.length = du.length;
        payloadHeader.type = du.type; // Single complete MPU
        payloadHeader.fragmentationIndicator = 0x00; // Using when du size is over to 2^16
        payloadHeader.aggregationFlag = this.be_aggregate;
        payloadHeader.randomAccessPointFlag = 0x01; // I-Frame
        payloadHeader.mpuSequenceNumberFlag = 0x01;
        payloadHeader.fragementCounter = 0;
        payloadHeaderObj = this.setPayloadHeader(payloadHeader);

        payload = Buffer.allocUnsafe(du.length + 2 + payloadHeaderObj.len).fill(0x00);
        payloadHeaderObj.buf.copy(payload, payloadIterator, 0, payloadHeaderObj.len);
        payloadIterator += payloadHeaderObj.len;
        duLenBuf = Buffer.allocUnsafe(2).fill(0x00 | du.length);
        duLenBuf.copy(payload, payloadIterator, 0, 2);
        payloadIterator += 2;
        du.data.copy(payload, payloadIterator, 0, du.length);
        payloadIterator += du.length;

        this.payloadList_.push({
            payload : payload,
            length : payloadIterator
        });
        
        this.duListIterator_++;
        if (this.duListIterator_ > this.duListLimit_) {
            this.duList_.splice(0, this.duListIterator_);
            this.duListIterator_ = 0;
        }
        this.storedDUCnt_--;

        return ret;
    }

    setPayloadHeader (payloadHeader) {
        let payloadHeaderBuf = null;
        let payloadIter = 0;
        let typeBuffer = Buffer.allocUnsafe(1).fill(payloadHeader.type);
        let flagsBuffer = Buffer.allocUnsafe(1).fill(((0x00 | payloadHeader.fragmentationIndicator) << 6) | 
                                                     ((0x00 | payloadHeader.aggregationFlag)        << 5) | 
                                                     ((0x00 | payloadHeader.randomAccessPointFlag)  << 4) |
                                                     ((0x00 | payloadHeader.mpuSequenceNumberFlag)  << 3) |
                                                      (0x00 | payloadHeader.S));
        let seqNumBuffer = Buffer.allocUnsafe(4).fill(payloadHeader.mpuSequenceNumber);
        let fragCntBuffer = Buffer.allocUnsafe(1).fill(0x00 | payloadHeader.fragementCounter);

        payloadHeaderBuf = Buffer.allocUnsafe(1 + 1 + 4 + 1).fill(0x00);
        typeBuffer.copy(payloadHeaderBuf, payloadIter, 0, 1);
        payloadIter += 1;
        flagsBuffer.copy(payloadHeaderBuf, payloadIter, 0, 1);
        payloadIter += 1;
        if (payloadHeader.mpuSequenceNumberFlag) {
            seqNumBuffer.copy(payloadHeaderBuf, payloadIter, 0, 4);
            payloadIter += 4;
        }
        fragCntBuffer.copy(payloadHeaderBuf, payloadIter, 0, 1);
        payloadIter += 1;

        return {buf: payloadHeaderBuf, len:payloadIter};
    }
/*
    makeMFUHeader (mfuHeader) {
        let header = null;
        let headerIter = 0;

        let fragmentedMPUHeader = Buffer.allocUnsafe(1).fill(((0x00 | mfuHeader.fragmentType) << 1) | (0x00 | mfuHeader.Timed));
        if (mfuHeader.Timed === 0x00) { // timed media
            let seqNumBuf = Buffer.allocUnsafe(4).fill(mfuHeader.movieFragSeqNum);
            let sampleNumBuf = Buffer.allocUnsafe(4).fill(mfuHeader.sampleNum);
            let offsetBuf = Buffer.allocUnsafe(2).fill(mfuHeader.timedMediaOffset);
            let priorityBuf = Buffer.allocUnsafe(1).fill(0x00 | mfuHeader.timedMediaPriority);
            let depCntBuf = Buffer.allocUnsafe(1).fill(0x00 | mfuHeader.timedMediaDepCounter);

            header = Buffer.allocUnsafe(13).fill(0x00);
            fragmentedMPUHeader.copy(header, headerIter, 0, 1);
            headerIter += 1;
            seqNumBuf.copy(header, headerIter, 0, 4);
            headerIter += 4;
            sampleNumBuf.copy(header, headerIter, 0, 4);
            headerIter += 4;
            offsetBuf.copy(header, headerIter, 0, 2);
            headerIter += 2;
            priorityBuf.copy(header, headerIter, 0, 1);
            headerIter += 1;
            depCntBuf.copy(header, headerIter, 0, 1);
            headerIter += 1;
        }
        else if (mfuHeader.Timed === 0x01) { // non-timed media
            let itemIdBuf = Buffer.allocUnsafe(4).fill(mfuHeader.nonTimedMediaItemID);
            header = Buffer.allocUnsafe(5).fill(0x00);
            fragmentedMPUHeader.copy(header, headerIter, 0, 1);
            headerIter += 1;
            itemIdBuf.copy(header, headerIter, 0, 4);
            headerIter += 4;
        }

        return header;
    }*/

    /**
     * 
     * @param {*} type : require('./du-type');
     * @param {*} du : MPU / Fragmented MPU / Singnaling message / repair symbol / Generic object
     */
    addDataUnit (type, du) {
        this.duList_.push({
            type: type,
            data : du,
            length : du.length
        });
        this.storedDUcnt_ ++;
    }

    get payload () {
        let payload = this.payloadList_[this.payloadListIterator_];
        this.payloadListIterator_++;
        if (this.payloadListIterator_ > this.payloadListLimit_) {
            this.payloadList_.splice(0, this.payloadListIterator_);
            this.payloadListIterator_ = 0;
        }
        return payload;
    }
}
module.exports = payloadizer;