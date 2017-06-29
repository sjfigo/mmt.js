class MFU {
    constructor() {
        this._mfu_num = 0;
        this._next_mfu_num = 0;
        this._offset = 0;
        this._length = 0;
        this._video_sample_count = 0;
        this._video_sample_size_offset = 0;
        this._video_sample_size_seek_num = 0;
        this._video_sample_offset = 0;
        this._hint_sample_offset = 0;
    }
    get mfu_num () {
        return this._mfu_num;
    }
    set mfu_num (num) {
        this._mfu_num = num;
    }
    get next_mfu_num () {
        return this._next_mfu_num;
    }
    set next_mfu_num (num) {
        this._next_mfu_num = num;
    }
    get offset () {
        return this._offset;
    }
    set offset (offset) {
        this._offset = offset;
    }
    get length () {
        return this._length;
    }
    set length (length) {
        this._length = length;
    }
    get video_sample_count () {
        return this._video_sample_count;
    }
    set video_sample_count (cnt) {
        this._video_sample_count = cnt;
    }
    get video_sample_size_offset () {
        return this._video_sample_size_offset;
    }
    set video_sample_size_offset (offset) {
        this._video_sample_size_offset = offset;
    }
    get video_sample_size_seek_num () {
        return this._video_sample_size_seek_num;
    }
    set video_sample_size_seek_num (num) {
        this._video_sample_size_seek_num = num;
    }
    get video_sample_offset () {
        return this._video_sample_offset;
    }
    set video_sample_offset (offset) {
        this._video_sample_offset = offset;
    }
    get hint_sample_offset () {
        return this._hint_sample_offset;
    }
    set hint_sample_offset (offset) {
        this._hint_sample_offset = offset;
    }
}
module.exports = MFU;