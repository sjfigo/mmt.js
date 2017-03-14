class PayloadParser {
    constructor (payload, size) {
        this._payload = payload;
        this._size = size;

        this._type_pos = 0;
        this._type_size = 8;

        this._f_i_pos = 8;
        this._f_i_size = 2;

        this._A_pos = 10;
        this._A_size = 1;
        
        this._R_pos = 11;
        this._R_size = 1;

        this._M_pos = 12;
        this._M_size = 1;

        this._S_pos = 13;
        this._S_size = 3;

        this._MPU_sequence_number_pos = 16;
        this._MPU_sequence_number_size = 32;

        this._frag_count_pos = 48;
        this._frag_count_size = 8;

        this._DU_length_pos = 56;
        this._DU_length_size = 16;

        this._DU_Header_pos = 72;
        this._DU_Header_size = undefined;

        this._DU_payload_pos = undefined;
        this._DU_payload_size = undefined;
    }

    static getBits (data, dataSize, pos, size) {
        return (data << pos) >>> (dataSize - pos - size);
    }

    set packet (payload) {
        this._payload = payload;
    }

    set packetSize (size) {
        this._size = size;
    }

    get parse_type () {
        return this.getBits(this._payload, this._size, this._type_pos, this._type_size);
    }

    get parse_f_i () {
        return this.getBits(this._payload, this._size, this._f_i_pos, this._f_i_size);
    }

    get parse_A () {
        return this.getBits(this._payload, this._size, this._A_pos, this._A_size);
    }

    get parse_R () {
        return this.getBits(this._payload, this._size, this._R_pos, this._R_size);
    }

    get parse_M () {
        return this.getBits(this._payload, this._size, this._M_pos, this._M_size);
    }

    get parse_S () {
        return this.getBits(this._payload, this._size, this._S_pos, this._S_size);
    }

    get parse_MPU_sequence_number () {
        return this.getBits(this._payload, this._size, this._MPU_sequence_number_pos, this._MPU_sequence_number_size);
    }

    get parse_frag_count () {
        return this.getBits(this._payload, this._size, this._frag_count_pos, this._frag_count_size);
    }

    get parse_DU_length () {
        return this.getBits(this._payload, this._size, this._DU_length_pos, this._DU_length_size);
    }

    get parse_DU_Header () {
        return this.getBits(this._payload, this._size, this._DU_Header_pos, this._DU_Header_size);
    }

    get parse_DU_payload () {
        return this.getBits(this._payload, this._size, this._DU_payload_pos, this._DU_payload_size);
    }
}