class MFU {
    constructor() {
        this.mfu_num = 0;
        this.next_mfu_num = 0;
        this.offset = 0;
        this.length = 0;
        this.video_sample_count = 0;
        this.video_sample_size_offset = 0;
        this.video_sample_size_seek_num = 0;
        this.video_sample_offset = 0;
        this.hint_sample_offset = 0;
    }
    get mfu_num () {
        return this.mfu_num;
    }
    set mfu_num (num) {
        this.mfu_num = num;
    }
    get next_mfu_num () {
        return this.next_mfu_num;
    }
    set next_mfu_num (num) {
        this.next_mfu_num = num;
    }
    get offset () {
        return this.offset;
    }
    set offset (offset) {
        this.offset = offset;
    }
    get length () {
        return this.length;
    }
    set length (length) {
        this.length = length;
    }
    get video_sample_count () {
        return this.video_sample_count;
    }
    set video_sample_count (cnt) {
        this.video_sample_count = cnt;
    }
    get video_sample_size_offset () {
        return this.video_sample_size_offset;
    }
    set video_sample_size_offset (offset) {
        this.video_sample_size_offset = offset;
    }
    get video_sample_size_seek_num () {
        return this.video_sample_size_seek_num;
    }
    set video_sample_size_seek_num (num) {
        this.video_sample_size_seek_num = num;
    }
    get video_sample_offset () {
        return this.video_sample_offset;
    }
    set video_sample_offset (offset) {
        this.video_sample_offset = offset;
    }
    get hint_sample_offset () {
        return this.hint_sample_offset;
    }
    set hint_sample_offset (offset) {
        this.hint_sample_offset = offset;
    }
}
module.exports = MFU;