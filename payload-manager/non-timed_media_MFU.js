class NonTimedMediaMFUHeader {
    constructor (item_ID) {
        this.item_ID_ = item_ID;
    }

    make() {
        return Buffer.allocUnsafe(32).fill(this.item_ID_);
    }

    set item_ID (id) {
        this.item_ID_ = id;
    }
    get item_ID () {
        return this.item_ID_;
    }
}
module.exports = NonTimedMediaMFUHeader;