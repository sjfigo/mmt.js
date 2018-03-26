class NonTimedMediaMFUHeader {
    constructor (item_ID) {
        this.item_ID_ = item_ID;
        this.size_ = 32;
    }

    make() {
        let buf = Buffer.allocUnsafe(this.size_).fill(0x00);
        buf.writeUIntBE(this.item_ID_, 0, this.size_);
        return buf;
    }

    get totalSize () {
        return this.size_;
    }

    set item_ID (id) {
        this.item_ID_ = id;
    }
    get item_ID () {
        return this.item_ID_;
    }
}
module.exports = NonTimedMediaMFUHeader;