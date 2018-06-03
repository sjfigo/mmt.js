var Item = require("./SequentialList").Item;
var SequentialList = require("./SequentialList").SequentialList;

class UDPBuffer {
    constructor () {
        this._seqList = new SequentialList();
    }
    
    getFirstPacket () {
        let item = this._seqList.getNextSeqItem();
        if (item !== null) {
            console.log("Pull from seqList - " + item.data.packetID + " - " + item.data.packetSequenceNumber);
        
            return item.data;
        }
        else {
            return null;
        }
    }

    checkFirstPacket () {
        let item = this._seqList.checkNextSeqItem();
        if (item !== null) {
            console.log("Check from seqList - " + item.data.packetID + " - " + item.data.packetSequenceNumber);
        
            return item.data;
        }
        else {
            return null;
        }
    }
    
    setPacket (packet, seq) {
        let item = new Item();
        item.seq = seq;
        item.data = packet;
        if(this._seqList.putItem(item) === false) {
            console.log("Drop packet. seq: " + item.seq);
        }

        return true;
    }

    getPacketById (id) {
        let packetSet = [];
        let packet = null;
        let checkPacket = this.checkFirstPacket();

        console.log("SequentialList length before getPacketById: " + this._seqList.length);
        // less the id(parameter) than delete
        while (checkPacket !== null && checkPacket.packetID < id) {
            packet = this.getFirstPacket();
            checkPacket = this.checkFirstPacket();
        }
        while(checkPacket !== null && checkPacket.packetID === id) {
            packet = this.getFirstPacket();
            packetSet.push(packet);
            checkPacket = this.checkFirstPacket();
        }

        /*if (packet !== null) {
            console.log("Push to seqList - " + packet.packetID + " - " + packet.packetSequenceNumber);
            this.setPacket(packet, packet.packetSequenceNumber);
        }*/
        console.log("SequentialList length after getPacketById: " + this._seqList.length);
   
        if (packetSet.length > 0) {
            return packetSet;
        }
        else {
            return null;
        }
    }
}

module.exports = UDPBuffer;