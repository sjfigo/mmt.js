class moofMetadata {
    constructor() {
        this.first_moof_flag = 0;
        this.moof_offset = 0;
        this.mdat_offset = 0;
        this.mdat_size = 0;
    }
    get first_moof_flag () {
        return this.first_moof_flag;
    }
    set first_moof_flag (flag) {
        this.first_moof_flag = flag;
    }
    get moof_offset () {
        return this.moof_offset;
    }
    set moof_offset (offset) {
        this.moof_offset = offset;
    }
    get mdat_offset () {
        return this.mdat_offset;
    }
    set mdat_offset (offset) {
        this.mdat_offset = offset;
    }
    get mdat_size () {
        return this.mdat_size;
    }
    set mdat_size (size) {
        this.mdat_size = size;
    }
}
module.exports = moofMetadata;