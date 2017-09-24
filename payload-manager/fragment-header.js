class fragmentHeader {
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
}