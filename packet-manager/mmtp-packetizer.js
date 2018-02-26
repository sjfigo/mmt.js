var mmtpPacket = require("./mmtp-packet");
var NTP = require("./ntp");

class mmtpPacketizer {
    constructor () {
        this.packetList = [];
        this.packetIterator = 0;
        this.packetCounter = 0;
        this.packetSeqNum = 0;
        this.prePktId = 0;
        this.ntp = new NTP();
    }

    get packet () {
        if (this.packetList.length > 0) {
            if (packetIterator > 100 && this.packetList.length > this.packetIterator+1) {
                this.packetList.splice(0, this.packetIterator);
                this.packetIterator = 0;
            }
            let packet = this.packetList[this.packetIterator++];
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
        
        packet.version = 0x00;
        packet.packetCounterFlag = 0x01;
        packet.fecType = 0x03;
        packet.privateUserDataFlag = 0x00;
        packet.extensionFlag = 0x00;
        packet.packetID = packetId;
        
        if (!packet.packetCounterFlag) {
            payloadMaxSize += 4;
        }
        else { // It is incremented by the sending of an MMT packet and is different from the value packet_id.
            packet.packetCounter = this.packetCounter;
            if (packet.packetID != this.prePktId) {
                this.packetCounter ++;
                this.prePktId = packet.packetID;
            }
        }

        if (!packet.privateUserDataFlag) {
            payloadMaxSize += 2;
        }
        else { // For private user data
            packet.private_user_data = 0x00;
        }

        if (!packet.extensionFlag) {
            payloadMaxSize += 8;
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

        for (i = 0; i<fragSize; i+=payloadMaxSize) {
            packet.packetSequenceNumber = this.packetSeqNum;
            this.packetSeqNum ++;
            if (this.packetSeqNum > 0xFFFF) {
                this.packetSeqNum = 0;
            }
            packet.timestamp = this.ntp.now; // ??? using open source

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
            this.packetList.push(this.packetize(packet, copyLen));
        }
    }

    packetize (packet, size) {
        let iterator = 0;
        let pktData = Buffer.allocUnsafe(size).fill(0x00);
        
        let flagBuf = Buffer.allocUnsafe(2).fill(   (0x0000 | packet.version) << 14 |
                                                    (0x0000 | packet.packetCounterFlag) << 13 |
                                                    (0x0000 | packet.fecType) << 12 |
                                                    (0x0000 | packet.privateUserDataFlag) << 10 |
                                                    (0x0000 | packet.extensionFlag) << 9 |
                                                    (0x0000));
        flagBuf.copy(pktData, iterator, 0, 2);
        iterator += 2;
        
        let pktIdBuf = Buffer.allocUnsafe(2).fill(0x0000 | packet.packetID);
        pktIdBuf.copy(pktData, iterator, 0, 2);
        iterator += 2;
        
        let pktSeqBuf = Buffer.allocUnsafe(4).fill(0x00000000 | packet.packetSequenceNumber);
        pktSeqBuf.copy(pktData, iterator, 0, 4);
        iterator += 4;
        
        let tsBuf = Buffer.allocUnsafe(4).fill(0x00000000 | packet.timestamp);
        tsBuf.copy(pktData, iterator, 0, 4);
        iterator += 4;
        
        let pktCntBuf = null;
        if (packet.packetCounterFlag) {
            pktCntBuf = Buffer.allocUnsafe(4).fill(0x00000000 | packet.packetCounter);
            pktCntBuf.copy(pktData, iterator, 0, 4);
            iterator += 4;
        }
        
        let priUDBuf = null;
        if (packet.privateUserDataFlag) {
            priUDBuf = Buffer.allocUnsafe(2).fill(0x0000 | packet.private_user_data);
            priUDBuf.copy(pktData, iterator, 0, 2);
            iterator += 2;
        }
        
        let payloadData = packet.payload_data;
        payloadData.copy(pktData, iterator, 0, payloadData.length);
        iterator += payloadData.length;
        
        let fecIdBuf = null;
        if (packet.fecType === 0x01) { // Only use AL-FEC protection
            fecIdBuf = Buffer.allocUnsafe(4).fill(0x00000000 | packet.source_FEC_payload_ID);
            fecIdBuf.copy(pktData, iterator, 0, 4);
            iterator += 4;
        }
        
        let extBuf = null;
        if (packet.extensionFlag) {
            extBuf = Buffer.allocUnsafe(16).fill(   (0x0000000000000000 | packet.extType) << 48 |
                                                    (0x0000000000000000 | packet.extLength) << 32 |
                                                    (0x0000000000000000 | packet.ext_header_extension_value));
        }
        
        return pktData;
    }
}
module.exports = mmtpPacketizer;