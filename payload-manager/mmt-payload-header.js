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
                DU_data                 // DU_length bits, data unit header and payload(timed media, non-timed media, )
                ) 
    {
        this.packet = null;
        this.length_ = length;
        this.type_ = type;
        this.f_i_ = f_i;
        this.A_ = A;
        this.R_ = R;
        this.M_ = M;
        this.S_ = 0x00;
        this.MPU_sequence_number_ = MPU_sequence_number;
        this.frag_count_ = frag_count;
        this.DU_length_ = [];
        this.DU_data_ = [];

        if (DU_length !== undefined && DU_data !== undefined) {
            this.DU_length_.push(DU_length);
            this.DU_data_.push(DU_data);
        }
    }

    /*
    make () {
        let payload = null;
        let payloadIter = 0;
        let typeBuffer = Buffer.allocUnsafe(1).fill(this.type_);
        let flagsBuffer = Buffer.allocUnsafe(1).fill(((0x00 | this.f_i_) << 6) | 
                                                     ((0x00 | this.A_)   << 4) | 
                                                     ((0x00 | this.R_)   << 3) |
                                                     ((0x00 | this.M_)   << 3) |
                                                      (0x00 | this.S_)           );
        let seqNumBuffer = Buffer.allocUnsafe(4).fill(this.MPU_sequence_number_);
        let fragCntBuffer = Buffer.allocUnsafe(1).fill(0x00 | this.frag_count_);
        let DUBuffer = null;
        let DUBufferLen = 0;
        
        if (this.A_ === 0 || this.DU_length_.length == 1) {
            this.A_ = 0;

            let DULenBuffer = Buffer.allocUnsafe(2).fill(0x00 | this.DU_length_[0]);
            let DUHeaderLen = 0; // by this.DUHeader type
            let DUHeaderBuffer = Buffer.allocUnsafe(DUHeaderLen).fill(0x00 | this.DU_Header_[0]);
            let DUPayloadBuffer = Buffer.allocUnsafe(this.DU_length_[0]).fill(0x00 | this.DU_Payload_[0]);
            
            DUBufferLen = 2 + DUHeaderLen + this.DU_length_[0];
            DUBuffer = Buffer.allocUnsafe(DUBufferLen).fill(0x00);
            DULenBuffer.copy(DUBuffer, 0, 0, 2);
            DUHeaderBuffer.copy(DUBuffer, 2, 0, 0);
            DUPayloadBuffer.copy(DUBuffer, 2 + DUHeaderLen, 0, this.DU_length_[0]);
        }
        else {
            let DUCnt = this.DU_length_.length;
            let DUBufferIter = 0;
            let i = 0;
            for (i=0; i<DUCnt; i++) {
                let DUHeaderLen = 0; // by this.DUHeader type
                DUBufferLen += 2;
                DUBufferLen += DUHeaderLen;
                DUBufferLen += this.DU_length_[i];
            }

            DUBuffer = Buffer.allocUnsafe(DUBufferLen).fill(0x00);
            for (i=0; i<DUCnt; i++) {
                let DULenBuffer = Buffer.allocUnsafe(2).fill(0x00 | this.DU_length_[0]);
                let DUHeaderLen = 0; // by this.DUHeader type
                let DUHeaderBuffer = Buffer.allocUnsafe(DUHeaderLen).fill(0x00 | this.DU_Header_[0]);
                let DUPayloadBuffer = Buffer.allocUnsafe(this.DU_length_[0]).fill(0x00 | this.DU_Payload_[0]);
                
                DULenBuffer.copy(DUBuffer, DUBufferIter, 0, 2);
                DUBufferIter += 2;
                DUHeaderBuffer.copy(DUBuffer, DUBufferIter, 0, DUHeaderLen);
                DUBufferIter += DUHeaderLen;
                DUPayloadBuffer.copy(DUBuffer, DUBufferIter, 0, this.DU_length_[i]);
                DUBufferIter += this.DU_length_[i];
            }
        }

        payload = Buffer.allocUnsafe(1 + 1 + 4 + 1 + DUBufferLen).fill(0x00);
        typeBuffer.copy(payload, payloadIter, 0, 1);
        payloadIter += 1;
        flagsBuffer.copy(payload, payloadIter, 0, 1);
        payloadIter += 1;
        seqNumBuffer.copy(payload, payloadIter, 0, 4);
        payloadIter += 4;
        fragCntBuffer.copy(payload, payloadIter, 0, 1);
        payloadIter += 1;
        DUBuffer.copy(payload, payloadIter, 0, DUBufferLen);
        payloadIter += DUBufferLen;

        return {data: payload, len:payloadIter};
    }

    set length (len) {
        this.length_ = len;
    }
    get length () {
        return this.length_;
    }*/
    
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
    get typeBytes () {
        return 1;
    }

    /**
     * 00 - number of data units >= 1
    * 01 - first fragment of data unit
    * 10 - fragment of data unit that is neither the first nor the last part
    * 11 - last fragment of data unit
    */
    set fragmentationIndicator (fi) {
        this.f_i_ = fi;
    }
    get fragmentationIndicator () {
        return this.f_i_;
    }
    get fragmentationIndicatorBits () {
        return 2;
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
    get aggregationFlagBits () {
        return 1;
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
    get randomAccessPointFlagBits () {
        return 1;
    }
    isRandomAccessPoint () {
        return this.R_;
    }

    set mpuSequenceNumberFlag (m) {
        this.M_ = m;
    }
    get mpuSequenceNumberFlag () {
        return this.M_;
    }
    get mpuSequenceNumberFlagBits () {
        return 1;
    }
    isMpuSequenceNumberFlag () {
        return this.M_;
    }

    set S (s) {
        this.S_ = s;
    }
    get S () {
        return this.S_;
    }
    get S_Bits () {
        return 3;
    }

    set fragmentCounter (frag_count) {
        this.frag_count_ = frag_count;
    }
    get fragmentCounter () {
        return this.frag_count_;
    }
    get fragmentCounterBytes () {
        return 1;
    }

    set mpuSequenceNumber (mpu_sequence_number) {
        this.MPU_sequence_number_ = mpu_sequence_number;
    }
    get mpuSequenceNumber () {
        return this.MPU_sequence_number_;
    }
    get mpuSequenceNumberBytes () {
        if (this.M_) {
            return 4;
        }
        else {
            return 0;
        }
    }

    setDataUnit (du, length) {
        if (du !== null && length !== null)
        {
            this.DU_length_.push(length);
            this.DU_data_.push(du);
        }
    }
    getDataUnit (n) {
        if (n !== undefined && this.DU_length_.length < n) {
            return {lengths: this.DU_length_[n], datas: this.DU_data_[n]};
        }
        else {
            return null;
        }
    }

    get DataUnitLengths () {
        return this.DU_length_;
    }

    get DataUnitDatas () {
        return this.DU_data_;
    }

}
module.exports = mmtPayloadHeader;