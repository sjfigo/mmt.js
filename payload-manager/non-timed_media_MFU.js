class NonTimedMediaMFUHeader {
    constructor (item_ID) {
        this.item_ID_ = item_ID;
        this.size_ = 32;
    }

    make() {
        return Buffer.allocUnsafe(this.size_).fill(this.item_ID_);
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