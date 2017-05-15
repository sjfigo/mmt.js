class MPUMetadata {
    constructor() {
        this.moov_offset = 0;
        this.video_trak_id = 0;
        this.hint_trak_id = 0;
        this.asset_type = 0;
    }
    get moov_offset () {
        return moov_offset;
    }
    set moov_offset (offset) {
        this.moov_offset = offset;
    }
    get video_trak_id () {
        return this.video_trak_id;
    }
    set video_trak_id (id) {
        this.video_trak_id = id;
    }
    get hint_trak_id () {
        return this.hint_trak_id;
    }
    set hint_trak_id (id) {
        this.hint_trak_id = id;
    }
    get asset_type () {
        return this.asset_type;
    }
    set asset_type (type) {
        this.asset_type = type;
    }
}
module.exports = MPUMetadata;