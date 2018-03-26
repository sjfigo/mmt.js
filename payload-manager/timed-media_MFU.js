class TimedMediaMFUHeader {
    constructor (movie_fragment_sequence_number,
                 sample_number,
                 offset,
                 priority,
                 dep_counter) {
        this.movie_fragment_sequence_number_ = movie_fragment_sequence_number;
        this.sample_number_ = sample_number;
        this.offset_ = offset;
        this.priority_ = priority;
        this.dep_counter_ = dep_counter;
        this.size_ = 12;
    }

    make () {
        let mfuHeader = Buffer.allocUnsafe(this.size_).fill(0x00);
        
        mfuHeader.writeUIntBE(this.movie_fragment_sequence_number_, 0, 4);
        mfuHeader.writeUIntBE(this.sample_number_, 4, 4);
        mfuHeader.writeUIntBE(this.offset_, 8, 2);
        mfuHeader.writeUIntBE(this.priority_, 10, 2);
        
        return mfuHeader;
    }

    get totalSize () {
        return this.size_;
    }

    set movie_fragment_sequence_number (seqNum) {
        this.movie_fragment_sequence_number_ = seqNum;
    }
    get movie_fragment_sequence_number () {
        return this.movie_fragment_sequence_number_;
    }

    set sample_number (num) {
        this.sample_number_ = num;
    }
    get sample_number () {
        return this.sample_number_;
    }

    set offset (o) {
        this.offset_ = o;
    }
    get offset () {
        return this.offset_;
    }

    set priority (p) {
        this.priority_ = p;
    }
    get priority () {
        return this.priority_;
    }

    set dep_counter (cnt) {
        this.dep_counter_ = cnt;
    }
    get dep_counter () {
        return this.dep_counter_;
    }
}
module.exports = TimedMediaMFUHeader;