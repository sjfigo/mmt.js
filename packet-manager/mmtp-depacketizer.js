var mmtpPacket = require("mmtp-packet.js");

class mmtpDepacketizer {
    constructor () {
        this.packetList = [];
    }

    set Packet (packet) {
        let stPkt = this.depacketize(packet);
        this.packetList.push(stPkt);
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
        iterator += 4;

        packet.timestamp = pktBuf.readUInt32BE(iterator);
        iterator += 4;

        if (packet.packetCounterFlag !== null) {
            packet.packetCounter = pktBuf.readUInt32BE(iterator);
            iterator += 4;
        }

        if (packet.privateUserDataFlag !== null) {
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
            packet.source_FEC_payload_ID = pktBuf.readUInt32(iterator);
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