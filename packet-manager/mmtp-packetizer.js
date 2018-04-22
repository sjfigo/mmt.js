var mmtpPacket = require("./mmtp-packet");
var NTP = require("./ntp");

class mmtpPacketizer {
    constructor () {
        console.log("mmtpPacketizer constructor");
        this.packetList = [];
        this.packetIterator = 0;
        this.packetCounter = 0;
        this.packetSeqNum = 0;
        this.prePktId = 0;
        this.ntp = new NTP();
    }

    get packet () {
        console.log("getPacket - "+this.packetList.length);
        if (this.packetList.length - this.packetIterator > 0) {
            if (this.packetIterator > 100 && this.packetList.length > this.packetIterator+1) {
                this.packetList.splice(0, this.packetIterator);
                this.packetIterator = 0;
            }
            let packet = this.packetList[this.packetIterator++];
            console.log(packet);
            return packet;
        }
        else {
            return null;
        }
    }

    reset () {
        this.packetIterator = 0;
        this.packetList.splice(0, this.packetList.length);
    }

    setFragment (fragment, packetId) {
        let i = 0;
        let fragSize = fragment.length;
        let packet = new mmtpPacket ();
        let payloadMaxSize = packet.MTU - 32;
        let packetHeaderSize = 32;
        
        packet.version = 0x00;
        packet.packetCounterFlag = 0x01;
        packet.fecType = 0x03;
        packet.privateUserDataFlag = 0x00;
        packet.extensionFlag = 0x00;
        packet.packetID = packetId;
        
        if (!packet.packetCounterFlag) {
            payloadMaxSize += 4;
            packetHeaderSize -= 4;
        }
        else { // It is incremented by the sending of an MMT packet and is different from the value packet_id.
            if (packet.packetID != this.prePktId) {
                this.packetCounter ++;
                this.prePktId = packet.packetID;
            }
            packet.packetCounter = this.packetCounter;
            console.log("Packetizer - packet counter: " + packet.packetCounter + ", packet id: " + packet.packetID);            
        }

        if (!packet.privateUserDataFlag) {
            payloadMaxSize += 2;
            packetHeaderSize -= 2;
        }
        else { // For private user data
            packet.private_user_data = 0x00;
        }

        if (!packet.extensionFlag) {
            payloadMaxSize += 8;
            packetHeaderSize -= 8;
        }
        else { // user-defined information
            packet.extType = 0x00;
            packet.extLength = 0x00;
            packet.ext_header_extension_value = 0x00;
        }

        if (packet.fecType === 0x01) {
            packet.source_FEC_payload_ID = 0x00; //??? Annex C.4.2
        }
        else {
            packet.source_FEC_payload_ID = 0x00; //???
        }

        console.log("fragSize - "+fragSize);
        for (i = 0; i<fragSize; i+=payloadMaxSize) {
            packet.packetSequenceNumber = this.packetSeqNum;
            this.packetSeqNum ++;
            if (this.packetSeqNum > 0xFFFF) {
                this.packetSeqNum = 0;
            }
            packet.timestamp = this.ntp.now; // ??? using open source
            console.log('ntp: '+packet.timestamp);

            let copyLen = 0;
            if (i + payloadMaxSize >= fragSize) {
                copyLen = fragSize - i;
            }
            else {
                copyLen = payloadMaxSize;
            }
            let payloadData = Buffer.allocUnsafe(copyLen).fill(0x00);
            fragment.copy(payloadData, 0, i, i + copyLen);
            packet.payload_data = payloadData;
            let packetData = this.packetize(packet, copyLen, packetHeaderSize);
            this.packetList.push(packetData);
            console.log("packetize - "+i+" "+fragSize+" "+payloadMaxSize);
        }
    }

    packetize (packet, size, headerSize) {
        let iterator = 0;
        let pktData = Buffer.allocUnsafe(size + headerSize).fill(0x00);
        
        let flagBufLen = packet.versionBits + packet.packetCounterFlagBits + packet.fecTypeBits + packet.privateUserDataFlagBits + packet.extensionFlagBits + packet.reservedBits;
        let flagBufShiftLen = flagBufLen - packet.versionBits;
        flagBufLen /= 8; // To bytes
        let flagBuf = 0x00;
        flagBuf |= packet.version << flagBufShiftLen;
        flagBufShiftLen -= packet.packetCounterFlagBits;
        flagBuf |= packet.packetCounterFlag << flagBufShiftLen;
        flagBufShiftLen -= packet.fecTypeBits;
        flagBuf |= packet.fecType << flagBufShiftLen;
        flagBufShiftLen -= packet.privateUserDataFlagBits; 
        flagBuf |= packet.privateUserDataFlag << flagBufShiftLen;
        flagBufShiftLen -= packet.extensionFlagBits;
        flagBuf |= packet.extensionFlag << flagBufShiftLen;
        console.log("packetize: " + size + "  " + headerSize + " " + flagBuf + "  " + flagBufLen + " " + iterator);
        pktData.writeUIntBE(flagBuf, iterator, flagBufLen);
        iterator += flagBufLen;
        
        // Set packet id
        pktData.writeUInt16BE(packet.packetID, iterator, packet.packetIDBytes);
        iterator += packet.packetIDBytes;
        
        // Set packet sequence number
        pktData.writeUIntBE(packet.packetSequenceNumber, iterator, packet.packetSequenceNumberBytes);
        console.log("packetizer - packet seq num - " + packet.packetSequenceNumber + " - " +pktData.readUInt32LE(iterator) + " - " + iterator);
        iterator += packet.packetSequenceNumberBytes;
        
        // Set timestamp
        console.log("packetizer - packet timestamp - " + packet.timestamp + " - " +iterator + " - " + packet.timestampBytes);
        pktData.writeUIntBE(packet.timestamp, iterator, packet.timestampBytes);
        iterator += packet.timestampBytes;
        
        if (packet.packetCounterFlag) {
            // Set packet counter
            pktData.writeUIntBE(packet.packetCounter, iterator, packet.packetCounterBytes);
            iterator += packet.packetCounterBytes;
        }
        
        if (packet.privateUserDataFlag) {
            // Set private user data
            pktData.writeUIntBE(packet.private_user_data, iterator, packet.private_user_dataBytes);
            iterator += packet.private_user_dataBytes;
        }
        
        // Set payload
        packet.payload_data.copy(pktData, iterator, 0, packet.payload_data.length);
        iterator += packet.payload_data.length;
        
        if (packet.fecType === 0x01) { // Only use AL-FEC protection
            // Set AL-FEC payload ID
            pktData.writeUIntBE(packet.source_FEC_payload_ID, iterator, packet.source_FEC_payload_ID_Bytes);
            iterator += packet.source_FEC_payload_ID_Bytes;
        }
        
        if (packet.extensionFlag) {
            // Set extension type/length/value
            pktData.writeUIntBE(packet.extType, iterator, packet.extTypeBytes);
            iterator += packet.extTypeBytes;
            pktData.writeUIntBE(packet.extLength, iterator, packet.extLengthBytes);
            iterator += packet.extLengthBytes;
            pktData.writeUIntBE(packet.ext_header_extension_value, iterator, packet.ext_header_extension_valueBytes);
            iterator += packet.ext_header_extension_valueBytes;
        }
        
        return pktData;
    }
}
module.exports = mmtpPacketizer;