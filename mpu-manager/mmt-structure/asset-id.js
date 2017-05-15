class AssetID {
    constructor () {
        this.scheme = null;
        this.length = null;
        this.value = null;
    }

    get scheme () {
        return this.scheme;
    }
    set scheme (scheme) {
        this.scheme = scheme;
    }
    get length () {
        return this.length;
    }
    set length (length) {
        this.length = length;
    }
    get value () {
        return this.value;
    }
    set value (value) {
        this.value = value;
    }
}
module.exports = AssetID;