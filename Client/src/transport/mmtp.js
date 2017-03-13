import Error from "../errors.js";

class MMTP_Parser {
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

            r_pos: 5,
            r_size: 1,

            X_pos: 6,
            X_size: 1,

            R_pos: 7,
            R_size: 1,

            RES_pos: 8,
            RES_size: 2,

            Type_pos: 10,
            Type_size: 6,

            packet_id_pos: 16,
            packet_id_size: 16,

            Timestamp_pos: 32,
            Timestamp_size: 32,

            packet_sequence_number_pos: 64,
            packet_sequence_number_size: 32,

            packet_counter_pos: 96,
            packet_counter_size: 32,

            type_pos: 128,
            type_size: 16,

            length_pos: 144,
            length_size: 16,

            Header_extension_value_pos: 160,
            Header_extension_value_size: undefined,

            payload_pos: undefined,
            payload_size: undefined,

            source_FEC_payload_ID_pos: undefined,
            source_FEC_payload_ID_size: 32
        };

        try {
            if (packet === null || packet === undefined || size <= 0 || size >= this._MTU) {
                throw Error.INVALID_PARAM;
            }
            this._packet = packet;
            this._packetSize = size;

            let v = this.parseV(packet, size);
        }
        catch (exeption) {
            return exeption;
        }
    }

    static getBits (data, dataSize, pos, size) {
        return (data << pos) >>> (dataSize - pos - size);
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

    get parseV0_r () {
        return this.getBits(this._packet, this._size, this._V0.r_pos, this._V0.r_size);
    }

    get parseV0_X () {
        return this.getBits(this._packet, this._size, this._V0.X_pos, this._V0.X_size);
    }

    get parseV0_R () {
        return this.getBits(this._packet, this._size, this._V0.R_pos, this._V0.R_size);
    }

    get parseV0_RES () {
        return this.getBits(this._packet, this._size, this._V0.RES_pos, this._V0.RES_size);
    }

    get parseV0_Type () {
        return this.getBits(this._packet, this._size, this._V0.Type_pos, this._V0.Type_size);
    }

    get parseV0_packet_id () {
        return this.getBits(this._packet, this._size, this._V0.packet_id_pos, this._V0.packet_id_size);
    }

    get parseV0_Timestamp () {
        return this.getBits(this._packet, this._size, this._V0.Timestamp_pos, this._V0.Timestamp_size);
    }

    get parseV0_packet_sequence_number () {
        return this.getBits(this._packet, this._size, this._V0.packet_sequence_number_pos, this._V0.packet_sequence_number_size);
    }

    get parseV0_packet_counter () {
        return this.getBits(this._packet, this._size, this._V0.packet_counter_pos, this._V0.packet_counter_size);
    }

    get parseV0_type () {
        return this.getBits(this._packet, this._size, this._V0.type_pos, this._V0.type_size);
    }

    get parseV0_length () {
        return this.getBits(this._packet, this._size, this._V0.length_pos, this._V0.length_size);
    }

    get parseV0_Header_extenstion_value () {
        return null;
    }

    get parseV0_payload () {
        const payloadSize_pos = 10; // Check this position !!!
        const payloadSize_size = 6; // Check this size !!!
        
        let header_extension_value = this.parseV0_Header_extenstion_value;
        
        this._V0.payload_pos = header_extension_value.pos + header_extension_value.size;
        this._V0.payload_size = this.getBits(this._packet, this._size, this._V0.payload_pos + payloadSize_pos, payloadSize_size);
        
        this._V0.source_FEC_payload_ID_pos = this._V0.payload_pos + this._V0.payload_size;

        return this.getBits(this._packet, this._size, this._V0.payload_pos, this._V0.payload_size);
    }

    get parseV0_source_FEC_payload_ID () {
        if (this._V0.source_FEC_payload_ID_pos === undefined) {
            this.parseV0_payload;
        }

        return this.getBits(this._pakcet, this._size, this._V0.source_FEC_payload_ID_pos, this._V0.source_FEC_payload_ID_size);
    }
}