class mmtpPacket {
    constructor(V,                          // 2bits, version
                C,                          // 1bit, packet counter flag
                FEC,                        // 2bits, FEC type
                P,                          // 1bit, private user data flag
                E,                          // 1bit, Extension flag
                RES,                        // 10bits, Reserved
                packet_id,                  // 16bits, packet ID
                packet_sequence_number,     // 32bits, packet sequence number
                timestamp,                  // 32bits, NTP time stamp
                packet_counter,             // 32bits, counting MMT packet
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
        this.RES_ = RES;
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

    set version (v) {
        this.V_ = v;
    }
    get version () {
        return this.V_;
    }

    set packetCounterFlag (c) {
        this.C_ = c;
    }
    get packetCounterFlag () {
        return this.C_;
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

    set privateUserDataFlag (p) {
        this.P_ = p;
    }
    get privateUserDataFlag () {
        return this.P_;
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
    isExtension () {
        return this.E_;
    }

    set packetID (id) {
        this.packet_id_ = id;
    }
    get packetID () {
        return this.packet_id_;
    }

    set packetSequenceNumber (packet_sequence_number) {
        this.packet_sequence_number_ = packet_sequence_number;
    }
    get packetSequenceNumber () {
        return this.packet_sequence_number_;
    }

    set timestamp (ts) {
        this.timestamp_ = ts;
    }
    get timestamp () {
        return this.timestamp_;
    }

    set packetCounter (packet_counter) {
        this.packet_counter_ = packet_counter;
    }
    get packetCounter () {
        return this.packet_counter_;
    }

    set private_user_data (data) {
        this.private_user_data_ = data;
    }
    get private_user_data () {
        return this.private_user_data_;
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

    set extType (type) {
        this.ext_type_ = type;
    }
    get extType () {
        return this.ext_type_;
    }

    set extLength (len) {
        this.ext_length_ = len;
    }
    get extLength () {
        return this.ext_length_;
    }

    set ext_header_extension_value (value) {
        this.ext_header_extension_value_ = value;
    }
    get ext_header_extension_value () {
        return this.ext_header_extension_value_;
    }
}