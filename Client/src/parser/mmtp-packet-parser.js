import Error from "../errors.js";

class MMTPPacketParser {
    constructor (packet, size) {
        this._MTU = 1500;
        this._packet = packet;
        this._packetSize = size;

        // Version
        this._V_pos = 0;
        this._V_size = 2;

        this._V0 = {
            // C
            C_pos: 2,
            C_size: 1,

            // RES
            FEC_pos: 3,
            FEC_size: 2,

            P_pos: 5,
            P_size: 1,

            E_pos: 6,
            E_size: 1,

            RES_pos: 7,
            RES_size: 9,

            packet_id_pos: 16,
            packet_id_size: 16,

            packet_sequence_number_pos: 32,
            packet_sequence_number_size: 32,

            timestamp_pos: 64,
            timestamp_size: 32,
            
            packet_counter_pos: 96,
            packet_counter_size: 32,

            private_user_data_pos: 128,
            private_user_data_size: 16,

            payload_pos: 144,
            payload_size: this._packetSize - this._V0.source_FEC_payload_ID_size - this._V0.payload_pos,

            source_FEC_payload_ID_pos: this._packetSize - this._V0.source_FEC_payload_ID_size,
            source_FEC_payload_ID_size: 32
        };

        try {
            if (packet === null || packet === undefined || size <= 0 || size >= this._MTU) {
                throw Error.INVALID_PARAM;
            }
            this._packet = packet;
            this._packetSize = size;
        }
        catch (exeption) {
            return exeption;
        }
    }

    static getBits (data, dataSize, pos, size) {
        return (data << pos) >>> (dataSize - pos - size);
    }

    set packet (packet) {
        this._packet = packet;
    }

    set packetSize (size) {
        this._packetSize = size;
    }

    get parseV () {
        return this.getBits(this._packet, this._size, this._V_pos, this._V_size);
    }

    get parseV0_C () {
        return this.getBits(this._packet, this._size, this._V0.C_pos, this._V0.C_size);
    }

    get parseV0_FEC () {
        return this.getBits(this._packet, this._size, this._V0.FEC_pos, this._V0.FEC_size);
    }

    get parseV0_P () {
        return this.getBits(this._packet, this._size, this._V0.P_pos, this._V0.P_size);
    }

    get parseV0_E () {
        return this.getBits(this._packet, this._size, this._V0.E_pos, this._V0.E_size);
    }

    get parseV0_RES () {
        return this.getBits(this._packet, this._size, this._V0.RES_pos, this._V0.RES_size);
    }

    get parseV0_packet_id () {
        return this.getBits(this._packet, this._size, this._V0.packet_id_pos, this._V0.packet_id_size);
    }

    get parseV0_packet_sequence_number () {
        return this.getBits(this._packet, this._size, this._V0.packet_sequence_number_pos, this._V0.packet_sequence_number_size);
    }

    get parseV0_timestamp () {
        return this.getBits(this._packet, this._size, this._V0.timestamp_pos, this._V0.timestamp_size);
    }

    get parseV0_packet_counter () {
        return this.getBits(this._packet, this._size, this._V0.packet_counter_pos, this._V0.packet_counter_size);
    }

    get parseV0_private_user_data () {
        return this.getBits(this._packet, this._size, this._V0.private_user_data_pos, this._V0.private_user_data_size);
    }

    get parseV0_payload () {
        return this.getBits(this._packet, this._size, this._V0.payload_pos, this._V0.payload_size);
    }

    get parseV0_source_FEC_payload_ID () {
        return this.getBits(this._pakcet, this._size, this._V0.source_FEC_payload_ID_pos, this._V0.source_FEC_payload_ID_size);
    }
}
exports.MMTPPacketParser = MMTPPacketParser;