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
        let movie_fragment_sequence_number = Buffer.allocUnsafe(4).fill(0x00 | this.movie_fragment_sequence_number_);
        let sample_number = Buffer.allocUnsafe(4).fill(0x00 | this.sample_number_);
        let offset = Buffer.allocUnsafe(2).fill(0x00 | this.offset_);
        let priorityNdep_counter = Buffer.allocUnsafe(2).fill(((0x00 | this.priority_) << 9) | (0x00 | this.dep_counter_));
        //let dep_counter = Buffer.allocUnsafe(1).fill(this.dep_counter_);
        movie_fragment_sequence_number.copy(mfuHeader, 0, 0, 4);
        sample_number.copy(mfuHeader, 4, 0, 4);
        offset.copy(mfuHeader, 8, 0, 2);
        priorityNdep_counter.copy(mfuHeader, 10, 0, 2);

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