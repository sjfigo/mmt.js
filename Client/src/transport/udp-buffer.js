//import Item from "../../util/SequentialList.js";
//import SequentialList from "../../util/SequentialList.js";
//import MMTPPacketParser from "../parser/mmtp-packet-parser.js";

var Item = require("../../util/SequentialList.js").Item;
var SequentialList = require("../../util/SequentialList.js").SequentialList;
var MMTPPacketParser = require("../parser/mmtp-packet-parser.js").MMTPPacketParser;

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
        if(!this._seqList.putItem(item)) {
            console.log("Drop packet. seq: " + item.seq);
        }

        return true;
    }
}

exports.UDP_Buffer = UDP_Buffer;