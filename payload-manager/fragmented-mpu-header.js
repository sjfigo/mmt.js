class FragmentedMPUHeader {
    constructor (FT, T) {
        this.FT_ = FT;  // 7bits, fragment type
        this.T_ = T;    // 1bit, timed or non-timed
    }

    
    make () {
        let header = null;
        let headerIter = 0;

        let fragmentedMPUHeader = Buffer.allocUnsafe(1).fill(0x00);
        fragmentedMPUHeader.writeUInt8((this.FT_ << 1) | this.T_);
        return fragmentedMPUHeader;
    }

    get length () {
        return 1; // 1 byte
    }

    set fragmentType (ft) {
        this.FT_ = ft;
    }
    get fragmentType () {
        return this.FT_;
    }

    setTimed () {
        this.T_ = 0x00;
    }
    setNonTimed () {
        this.T_ = 0x01;
    }
    isTimed () {
        if (this.T_ === 0x00) {
            return true;
        }
        else if (this.T_ === 0x01) {
            return false;
        }
    }
    get Timed () {
        return this.T_;
    }
}
module.exports = FragmentedMPUHeader;