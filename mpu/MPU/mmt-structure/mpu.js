class MPU {
    constructor (data, size) {
        this.mpuData = data;
        this.descriptor = 0;
        this.mpuDataSize = size;
        this.mpu_num = null;
        this.mpuMetaDataFlag = false;
        this.assetType = null;
        this.moovOffset = null;
        this.videoTrakId = null;
        this.hintTrakId = null;
        this.videoSampleCount = null;
        this.moovOffset = null;
        this.videoSampleSizeOffset = null;
        this.moofOffset = null;
        this.videoSampleSizeOffset = null;
        this.videoSampleSizeSeekNum = null;
        this.videoSampleOffset = null;
        this.hintSampleOffset = null;
    }
    get data () {
        return this.mpuData;
    }
    set data (data) {
        this.mpuData = data;
    }
    get dataSize () {
        return this.mpuDataSize;
    }
    set dataSize (size) {
        this.mpuDataSize = size;
    }
    get mpu_number () {
        return this.mpu_num;
    }
    set mpu_number (number) {
        this.mpu_num = number;
    }
    get mpu_metadata_flag () {
        return this.mpuMetaDataFlag;
    }
    set mpu_metadata_flag (flag) {
        this.mpuMetaDataFlag = flag;
    }
    get asset_type () {
        return this.assetType;
    }
    set asset_type (asset_type) {
        this.assetType = asset_type;
    }
    get moov_offset () {
        return this.moovOffset;
    }
    set moov_offset (moov_offset) {
        this.moovOffset = moov_offset;
    }
    get video_trak_id () {
        return this.videoTrakId;
    }
    set video_trak_id (video_trak_id) {
        this.videoTrakId = video_trak_id;
    }
    get hint_trak_id () {
        return this.hintTrakId;
    }
    set hint_trak_id (hint_trak_id) {
        this.hintTrakId = hint_trak_id;
    }
    get video_sample_count () {
        return this.videoSampleCount;
    }
    set video_sample_count (video_sample_count) {
        this.videoSampleCount = video_sample_count;
    }
    get moof_offset () {
        return this.moofOffset;
    }
    set moof_offset (moof_offset) {
        this.moofOffset = moof_offset;
    }
    get video_sample_size_offset () {
        return this.videoSampleSizeOffset;
    }
    set video_sample_size_offset ( video_sample_size_offset) {
        this.videoSampleSizeOffset = video_sample_size_offset;
    }
    get video_sample_size_seek_num () {
        return this.videoSampleSizeSeekNum;
    } 
    set video_sample_size_seek_num (video_sample_size_seek_num) {
        this.videoSampleSizeSeekNum = video_sample_size_seek_num;
    }
    get video_sample_offset () {
        return video_sample_offset;
    }
    set video_sample_offset (video_sample_offset) {
        this.videoSampleOffset = video_sample_offset;
    }
    get hint_sample_offset () {
        return this.hintSampleOffset;
    }
    set hint_sample_offset (hint_sample_offset) {
        this.hintSampleOffset = hint_sample_offset;
    }
}
module.exports = MPU;