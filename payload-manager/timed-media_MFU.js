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
    }

    make () {
        let mfuHeader = Buffer.allocUnsafe(96).fill(0x00);
        let movie_fragment_sequence_number = Buffer.allocUnsafe(32).fill(this.movie_fragment_sequence_number_);
        let sample_number = Buffer.allocUnsafe(32).fill(this.sample_number_);
        let offset = Buffer.allocUnsafe(16).fill(this.offset_);
        let priority = Buffer.allocUnsafe(9).fill(this.priority_);
        let dep_counter = Buffer.allocUnsafe(7).fill(this.dep_counter_);
        movie_fragment_sequence_number.copy(mfuHeader, 0, 0, 32);
        sample_number.copy(mfuHeader, 32, 0, 32);
        offset.copy(mfuHeader, 64, 0, 16);
        priority.copy(mfuHeader, 80, 0, 9);
        dep_counter.copy(mfuHeader, 89, 0, 7);

        return mfuHeader;
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