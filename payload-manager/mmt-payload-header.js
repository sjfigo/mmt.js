class mmtPayloadHeader {
    constructor(length,                 // 16bits, Length of payload excluding header
                type,                   // 8bits, Payload data type
                f_i,                    // 2bits, Fragment indicator
                A,                      // 1bit, Aggregated(1) or not, Aggregate: multi data unit in a payload
                R,                      // 1bit, Contain sync sample(1) or not for Random access point
                M,                      // 1bit, mpu_sequence_number field present(1) or not
                S,                      // 3bits, reserved
                MPU_sequence_number,    // 32bits, Sequence number of the MPU
                frag_count,             // 8bits, Number of payload containing fragments
                DU_length,              // 16bits, data unit length, ref Aggregated
                DU_Header,              // x bits, data unit header
                DU_Payload              // x bits, data unit
                ) 
    {
        this.packet = null;
        this.length_ = length;
        this.type_ = type;
        this.f_i_ = f_i;
        this.A_ = A;
        this.R_ = R;
        this.M_ = M;
        this.S_ = S;
        this.MPU_sequence_number_ = MPU_sequence_number;
        this.frag_count_ = frag_count;
        this.DU_length_ = DU_length;
        this.DU_Header_ = DU_Header;
        this.DU_Payload_ = DU_Payload;
    }

     set length (len) {
        this.length_ = len;
     }
     get length () {
         return this.length_;
     }
     
     /**
      * 0x00 - MPU 
      * 0x01 - MPU Fragment
      * 0x02 - signaling message
      * 0x03 - repair simbol
      * 0x04 - Generic Object
      * ~0xFF - reserved
      */
     set type (typ) {
         this.type_ = typ;
     }
     get type () {
         return this.type_;
     }

     /**
      * 00 - number of data units >= 1
      * 01 - first fragment
      * 10 - fragment of data unit that is neither the first nor the last part
      * 11 - last fragment of data unit
      */
     set fragmentationIndicator (fi) {
         this.f_i_ = fi;
     }
     get fragmentationIndicator () {
         return this.f_i_;
     }

     /**
      * 1 - aggrated this packet
      */
     set aggregationFlag (a) {
         this.A_ = a;
     }
     get aggregationFlag () {
         return this.A_;
     }
     isAggretated () {
        return this.A_;
     }

     /**
      * 1 - contain sync sample
      */
     set randomAccessPointFlag (rapFlag) {
         this.R_ = rapFlag;
     }
     get randomAccessPointFlag () {
         return this.R_;
     }
     isRandomAccessPoint () {
        return this.R_;
    }

    set mpuSequenceNumberFlag (m) {
        this.MPU_sequence_number_ = m;
    }
    get mpuSequenceNumberFlag () {
        return this.MPU_sequence_number_;
    }
    isMpuSequenceNumberFlag () {
        return this.MPU_sequence_number_;
    }

    set fragmentCounter (frag_count) {
        this.frag_count_ = frag_count;
    }
    get fragementCounter () {
        return this.frag_count_;
    }

    set mpuSequenceNumber (mpu_sequence_number) {
        this.MPU_sequence_number_ = mpu_sequence_number;
    }
    get mpuSequenceNumber () {
        return this.MPU_sequence_number_;
    }

    set DU_length (du_len) {
        this.DU_length_ = du_len;
    }
    get DU_length () {
        return this.DU_length_;
    }

    set DU_Header (du_header) {
        this.DU_Header_ = du_header;
    }
    get DU_Header () {
        return this.DU_Header_;
    }
}