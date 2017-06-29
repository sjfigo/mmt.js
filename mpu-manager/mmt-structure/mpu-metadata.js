class MPUMetadata {
    constructor() {
        this.moovOffset = 0;
        this.videoTrakId = 0;
        this.hintTrakId = 0;
        this.assetType = 0;
    }
    get moov_offset () {
        return this.moovOffset;
    }
    set moov_offset (offset) {
        this.moovOffset = offset;
    }
    get video_trak_id () {
        return this.videoTrakId;
    }
    set video_trak_id (id) {
        this.videoTrakId = id;
    }
    get hint_trak_id () {
        return this.hintTrakId;
    }
    set hint_trak_id (id) {
        this.hintTrakId = id;
    }
    get asset_type () {
        return this.assetType;
    }
    set asset_type (type) {
        this.assetType = type;
    }
}
module.exports = MPUMetadata;