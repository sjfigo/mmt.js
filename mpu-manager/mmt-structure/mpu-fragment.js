class MPUFragment {
    constructor (type, data, size) {
        this.mpufType = null;
        this.mpufData = null;
        this.mpufSize = null;
        this.mpufPosition = null;
        this.mpufTypeInfo = null; // MPU Metadata Info, MOOF Metadata Info or MFU Info
        if (type !== undefined) {
            this.mpufType = type;
        }
        if (data !== undefined) {
            this.mpufData = data;
        }
        if (size !== undefined) {
            this.mpufSize = size;
        }
    }

    get type () {
        return this.mpufType;
    }
    set type (type) {
        return this.mpufType = type;
    }
    get typeInfo () {
        return this.typeInfo;
    }
    set typeInfo (typeInfo) {
        this.typeInfo = typeInfo;
    }
    get data () {
        return this.mpufData;
    }
    set data (data) {
        this.mpufData = data;
    }
    get size () {
        return size;
    }
    set size (size) {
        this.mpufSize = size;
    }
    get position () {
        return this.mpufPosition;
    }
    set position (pos) {
        this.mpufPosition = pos;
    }
    get typeInfo () {
        return this.mpufTypeInfo;
    }
    set typeInfo (info) {
        this.mpufTypeInfo = info;
    }
}
module.exports = MPUFragment;