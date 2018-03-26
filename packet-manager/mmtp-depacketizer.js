var mmtpPacket = require("./mmtp-packet");

class mmtpDepacketizer {
    constructor () {
        this.packetList = [];
        this.iterator = 0;
    }

    set packet (packet) {
        let stPkt = this.depacketize(packet);
        this.packetList.push(stPkt);
    }

    get packet () {
        if (this.packetList.length > 0) {
            if (this.iterator > 100 && this.packetList.length > this.packetIterator+1) {
                this.packetList.splice(0, this.iterator);
                this.iterator = 0;
            }
            let stPkt = this.packetList[this.iterator++];
            return stPkt;
        }
        else {
            return null;
        }
    }

    makeFragment (packetSet, count) {
        let i = 0;
        let packet = null;
        let packetLen = 0;
        let totalSize = 0;
        let fragment = null;
        let fragIterator = 0;

        for (i=0; i<count; i++) {
            packet = packetSet[i];
            totalSize += packet.payload_data.length;
        }
        fragment = Buffer.allocUnsafe(totalSize).fill(0x00);
        for (i=0; i<count; i++) {
            packet = packetSet[i];
            packetLen = packet.payload_data.length;
            packet.payload_data.copy(fragment, fragIterator, 0, packetLen);
            fragIterator += packetLen;
        }

        return fragment;
    }

    depacketize (pktBuf) {
        let packet = new mmtpPacket ();
        let iterator = 0;
        let payloadEnd = pktBuf.length;

        let flags = pktBuf.readUInt16BE(iterator);
        packet.version = (flags | 0xC000) >>> 14;
        packet.packetCounterFlag = (flags | 0x2000) >>> 13;
        packet.fecType = (flags | 0x1800) >>> 12;
        packet.privateUserDataFlag = (flags | 0x0400) >>> 10;
        packet.extensionFlag = (flags | 0x0200) >>> 9;
        iterator += 2;

        packet.packetID = pktBuf.readUInt16BE(iterator);
        iterator += 2;

        packet.packetSequenceNumber = pktBuf.readUInt32BE(iterator);
        console.log("depacketizer - packet seq num - "+packet.packetSequenceNumber);
        iterator += 4;

        packet.timestamp = pktBuf.readUInt32BE(iterator);
        iterator += 4;

        if (packet.packetCounterFlag !== 0x00) {
            packet.packetCounter = pktBuf.readUInt32BE(iterator);
            iterator += 4;
        }

        if (packet.privateUserDataFlag !== 0x00) {
            packet.private_user_data = pktBuf.readUInt16BE(iterator);
            iterator += 2;
        }

        if (packet.fecType === 0x01) {
            payloadEnd -= 4;
        }

        if (packet.extensionFlag) {
            payloadEnd -= 16;
        }

        packet.payload_data = Buffer.allocUnsafe(payloadEnd - iterator).fill(0x00);
        pktBuf.copy(packet.payload_data, 0, iterator, payloadEnd);
        iterator = payloadEnd;

        if (packet.fecType === 0x01) {
            packet.source_FEC_payload_ID = pktBuf.readUInt32BE(iterator);
        }
        
        if (packet.extensionFlag) {
            packet.extType = pktBuf.readUInt16BE(iterator);
            iterator += 2;
            packet.extLength = pktBuf.readUInt16BE(iterator);
            iterator += 2;
            packet.ext_header_extension_value = pktBuf.readUInt32BE(iterator);
            iterator += 4;
        }

        return packet;
    }
}
module.exports = mmtpDepacketizer;