class GenericFileDeliveryPacket {
    constructor (O,             // 1bit, number of double words
                 S,             // 1bit, number of full 32-bit words in the TOI field. (32*S + 16*H bits) => 0, 16, 32 or 48 bits.
                 H,             // 1bit, allows the TOI field lengths to be multiples of a half-word (16 bits)
                 C,             // 1bit, last packet for this session
                 L,             // 1bit, last delivered packet for this object
                 B,             // 1bit, contains the last byte of the object
                 CP,            // 8bits, Code Point, mapping between the codepoint and the actual codec
                 RES,           // 2bits, reserved. set 00
                 start_offset,  // 16+32*O+16*H bits, location of the current fragment in the object
                 TOI,
                 payload) {         // 32xS+16*H bits, Transport Object Identifier
        this.O_ = O;
        this.S_ = S;
        this.H_ = H;
        this.C_ = C;
        this.L_ = L;
        this.B_ = B;
        this.CP_ = CP;
        this.RES_ = RES;
        this.start_offset_ = start_offset;
        this.TOI_ = TOI;
        this.payload_ = payload;
    }

    set O (o) {
        this.O_ = o;
    }
    get O () {
        return this.O_;
    }

    set S (s) {
        this.S_ = s;
    }
    get S () {
        return this.S_;
    }

    set H (h) {
        this.H_ = h;
    }
    get H () {
        return this.H_;
    }

    set C (c) {
        this.C_ = c;
    }
    get C () {
        return this.C_;
    }

    set L (l) {
        this.L_ = l;
    }
    get L () {
        return this.L_;
    }

    set B (b) {
        this.B_ = b;
    }
    get B () {
        return this.B_;
    }

    set CP (cp) {
        this.CP_ = cp;
    }
    get CP () {
        return this.CP_;
    }

    set start_offset (offset) {
        this.start_offset_ = offset;
    }
    get start_offset () {
        return this.start_offset_;
    }

    set TOI (toi) {
        this.TOI_ = toi;
    }
    get TOI () {
        return this.TOI_;
    }

    set payload (data) {
        this.payload_ = data;
    }
    get payload () {
        return this.payload_;
    }
}
module.exports = GenericFileDeliveryPacket;