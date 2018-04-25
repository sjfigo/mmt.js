class FragmentedMPUHeader {
    constructor (FT, T, movie_fragment_sequence_number, sample_number, offset, priority, dep_counter, item_ID) {
        this.FT_ = FT;  // 7bits, fragment type
        this.T_ = T;    // 1bit, timed or non-timed
        this.movie_fragment_sequence_number_ = movie_fragment_sequence_number;  // 32bits, only timed
        this.sample_number_ = sample_number;  // 32bits, only timed
        this.offset_ = offset;  // 16bits, only timed
        this.priority_ = priority;  // 9bits, only timed
        this.dep_counter_ = dep_counter;  // 7bits, only timed
        
        this.item_ID_ = item_ID; // 32bits, only non-timed
    }

    /*
    make () {
        let header = null;
        let headerIter = 0;

        let fragmentedMPUHeader = Buffer.allocUnsafe(1).fill(((0x00 | this.FT_) << 1) | (0x00 | this.T_));
        if (this.T_ === 0x00) { // timed media
            let seqNumBuf = Buffer.allocUnsafe(4).fill(this.movie_fragment_sequence_number_);
            let sampleNumBuf = Buffer.allocUnsafe(4).fill(this.sample_number_);
            let offsetBuf = Buffer.allocUnsafe(2).fill(this.offset_);
            let priorityBuf = Buffer.allocUnsafe(1).fill(0x00 | this.priority_);
            let depCntBuf = Buffer.allocUnsafe(1).fill(0x00 | this.dep_counter_);

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
        else if (this.T_ === 0x01) { // non-timed media
            let itemIdBuf = Buffer.allocUnsafe(4).fill(this.item_ID_);
            header = Buffer.allocUnsafe(5).fill(0x00);
            fragmentedMPUHeader.copy(header, headerIter, 0, 1);
            headerIter += 1;
            itemIdBuf.copy(header, headerIter, 0, 4);
            headerIter += 4;
        }

        return header;
    }*/

    setFragmentType (ft) {
        this.FT_ = ft;
    }
    get fragmentType () {
        return this.FT_;
    }

    setTimed () {
        this.T_ = 0x00;
    }
    setNonTimed () {
        this.T_ = 0x01;
    }
    isTimed () {
        if (this.T_ === 0x00) {
            return true;
        }
        else if (this.T_ === 0x01) {
            return false;
        }
    }
    get Timed () {
        return this.T_;
    }

    set movieFragSeqNum (num) {
        this.movie_fragment_sequence_number_ = num;
    }
    get movieFragSeqNum () {
        return this.movie_fragment_sequence_number_;
    }

    set sampleNum (num) {
        this.sample_number_ = num;
    }
    get sampleNum () {
        return this.sample_number_;
    }

    set timedMediaOffset (offset) {
        this.offset_ = offset;
    }
    get timedMediaOffset () {
        return this.offset_;
    }

    set timedMediaPriority (p) {
        this.priority_ = p;
    }
    get timedMediaPriority () {
        return this.priority_;
    }

    set timedMeidaDepCounter (cnt) {
        this.dep_counter_ = cnt;
    }
    get timedMediaDepCounter () {
        return this.dep_counter_;
    }

    set nonTimedMediaItemID (id) {
        this.item_ID_ = id;
    }
    get nonTimedMediaItemID () {
        return this.item_ID_;
    }
}
module.exports = FragmentedMPUHeader;