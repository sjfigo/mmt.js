import Item from "../../util/SequentialList.js";
import SequentialList from "../../util/SequentialList.js";
import MMTPPacketParser from "../parser/mmtp-packet-parser.js";

class UDP_Buffer {
    constructor () {
        this._seqList = new SequentialList();
    }

    getFirstPacket () {
        return this._seqList.getNextSeqItem();
    }
    setPacket (packet, size) {
        let item = new Item();
        let packetParser = new MMTPPacketParser(packet, size);
        item.seq(packetParser.parseV0_packet_sequence_number);
        item.data(packet);
        this._seqList.putItem(item);

        return true;
    }
}