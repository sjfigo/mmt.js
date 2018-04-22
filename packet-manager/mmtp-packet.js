class mmtpPacket {
    constructor(V,                          // 2bits, version
                C,                          // 1bit, packet counter flag
                FEC,                        // 2bits, FEC type
                P,                          // 1bit, private user data flag
                E,                          // 1bit, Extension flag
           //   RES,                        // 10bits, Reserved
                packet_id,                  // 16bits, packet ID (Mapped with Asset ID by MPT signaling msg)
                packet_sequence_number,     // 32bits, packet sequence number (In same packet ID)
                timestamp,                  // 32bits, NTP time stamp
                packet_counter,             // 32bits, counting MMT packet at send. (Related not with Asset.)
                private_user_data,          // 16bits, private user data
                payload_data,               // payload data
                source_FEC_payload_ID,      // 32bits, use only AL-FEC (FEC type is 1)

                ext_type,                   // 16bits, extension, user defined type
                ext_length,                 // 16bits, extension, user defined length
                ext_header_extension_value  // 32bits, extension, user defined length
                ) {
        this.V_ = V;
        this.C_ = C;
        this.FEC_ = FEC;
        this.P_ = P;
        this.E_ = E;
        this.RES_ = 0x00;
        this.packet_id_ = packet_id;
        this.packet_sequence_number_ = packet_sequence_number;
        this.timestamp_ = timestamp;
        this.packet_counter_ = packet_counter;
        this.private_user_data_ = private_user_data;
        this.payload_data_ = payload_data;
        this.source_FEC_payload_ID_ = source_FEC_payload_ID;

        this.ext_type_ = ext_type;
        this.ext_length_ = ext_length;
        this.ext_header_extension_value_ = ext_header_extension_value;
    }

    get MTU () {
        return 1500;
    }

    set version (v) {
        this.V_ = v;
    }
    get version () {
        return this.V_;
    }
    get versionBits () {
        return 2;
    }

    set packetCounterFlag (c) {
        this.C_ = c;
    }
    get packetCounterFlag () {
        return this.C_;
    }
    get packetCounterFlagBits () {
        return 1;
    }
    isPacketCounter () {
        return this.C_;
    }
    
    /**
     * 00 - without AL-FEC
     * 01 - with AL-FEC
     * 10 - repair symbol(s)
     * 11 - reserved
     */
    set fecType (fec) {
        this.FEC_ = fec;
    }
    get fecType () {
        return this.FEC_;
    }
    get fecTypeBits () {
        return 2;
    }

    set privateUserDataFlag (p) {
        this.P_ = p;
    }
    get privateUserDataFlag () {
        return this.P_;
    }
    get privateUserDataFlagBits () {
        return 1;
    }
    isPrivateUserData () {
        return this.P_;
    }

    set extensionFlag (e) {
        this.E_ = e;
    }
    get extensionFlag () {
        return this.E_;
    }
    get extensionFlagBits () {
        return 1;
    }
    isExtension () {
        return this.E_;
    }

    get reservedBits () {
        return 9;
    }

    set packetID (id) {
        this.packet_id_ = id;
    }
    get packetID () {
        return this.packet_id_;
    }
    get packetIDBytes () {
        return 2;
    }

    set packetSequenceNumber (packet_sequence_number) {
        this.packet_sequence_number_ = packet_sequence_number;
    }
    get packetSequenceNumber () {
        return this.packet_sequence_number_;
    }
    get packetSequenceNumberBytes () {
        return 4;
    }

    set timestamp (ts) {
        this.timestamp_ = ts;
    }
    get timestamp () {
        return this.timestamp_;
    }
    get timestampBytes () {
        return 4;
    }

    set packetCounter (packet_counter) {
        this.packet_counter_ = packet_counter;
    }
    get packetCounter () {
        return this.packet_counter_;
    }
    get packetCounterBytes () {
        if (this.C_) {
            return 4;
        }
        else {
            return 0;
        }
    }

    set private_user_data (data) {
        this.private_user_data_ = data;
    }
    get private_user_data () {
        return this.private_user_data_;
    }
    get private_user_dataBytes () {
        if (this.P_) {
            return 2;
        }
        else {
            return 0;
        }
    }

    set payload_data (data) {
        this.payload_data_ = data;
    }
    get payload_data () {
        return this.payload_data_;
    }

    set source_FEC_payload_ID (id) {
        this.source_FEC_payload_ID_ = id;
    }
    get source_FEC_payload_ID () {
        return this.source_FEC_payload_ID_;
    }
    get source_FEC_payload_ID_Bytes () {
        if (this.FEC_ === 0x01) {
            return 4;
        }
        else {
            return 0;
        }
    }

    set extType (type) {
        this.ext_type_ = type;
    }
    get extType () {
        return this.ext_type_;
    }
    get extTypeBytes () {
        if (this.this.E_) {
            return 2;
        }
        else {
            return 0;
        }
    }

    set extLength (len) {
        this.ext_length_ = len;
    }
    get extLength () {
        return this.ext_length_;
    }
    get extLengthBytes () {
        if (this.this.E_) {
            return 2;
        }
        else {
            return 0;
        }
    }

    set ext_header_extension_value (value) {
        this.ext_header_extension_value_ = value;
    }
    get ext_header_extension_value () {
        return this.ext_header_extension_value_;
    }
    get ext_header_extension_valueBytes () {
        if (this.this.E_) {
            return 4;
        }
        else {
            return 0;
        }
    }
}
module.exports = mmtpPacket;