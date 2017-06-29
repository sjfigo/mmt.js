class moofMetadata {
    constructor() {
        this.firstMoofFlag = true;
        //this.moofOffset = 0;
        this.mdatOffset = 0;
        this.mdatSize = 0;
    }
    get first_moof_flag () {
        return this.firstMoofFlag;
    }
    set first_moof_flag (flag) {
        this.firstMoofFlag = flag;
    }
    /*get moof_offset () {
        return this.moofOffset;
    }
    set moof_offset (offset) {
        this.moofOffset = offset;
    }*/
    get mdat_offset () {
        return this.mdatOffset;
    }
    set mdat_offset (offset) {
        this.mdatOffset = offset;
    }
    get mdat_size () {
        return this.mdatSize;
    }
    set mdat_size (size) {
        this.mdatSize = size;
    }
}
module.exports = moofMetadata;