var UdpController = require("../transport/udp-controller");
var mmtpDepacketizer = require("../packet-manager/mmtp-depacketizer");
var Depayloadizer = require("../payload-manager/depayloadizer");
var UDPBuffer = require("../util/udp-buffer");

var that = null;

class mmtpReceiver {
    constructor (host, port, client) {
        this.port_ = port;
        this.host_ = host;
        this.client_ = client;
        this.sock = new UdpController();   
        this.sock.onRecvCB = this.onRecv;

        //this.recvPackets = [];
        //this.recvPacketIteraotr = 0;

        this.mmtpDepack = new mmtpDepacketizer();
        this.depayloadizer = new Depayloadizer();
        this.udpBuffer = new UDPBuffer();

        this.ableAssemblyMPUFrag = [];
        this.assemblyMPUFragId = [];

        that = this;
    }

    ready () {
        this.sock.createUDPSock();
        console.log("bind - start: "+ this.host_+" "+this.port_);
        this.sock.bind(this.host_, this.port_, this.sayHello);
        console.log("bind - end");
    }

    sayHello () {
        console.log("sayHello - remote: "+that.host_+", "+that.port_+", local: "+that.sock.port);
        //this.sock.sendUDPSock(Buffer.from("mmt hello"), this.port_, this.host_);
        let portBuf = new Buffer(that.sock.port.toString());
        that.client_.send(portBuf);
    }

    onRecv (packet, info) {
        console.log("Recv packet - size: " + info.size);
        that.mmtpDepack.packet = packet;
        let stPacket = that.mmtpDepack.packet;
        if (stPacket !== null) {
            that.udpBuffer.setPacket(stPacket, stPacket.packetSequenceNumber);
            if (that.ableAssemblyMPUFrag[stPacket.packetID] === undefined) {
                that.ableAssemblyMPUFrag[stPacket.packetID] = 0;
            }
            that.ableAssemblyMPUFrag[stPacket.packetID]++;
            console.log("that.ableAssemblyMPUFrag[stPacket.packetID]: " + that.ableAssemblyMPUFrag[stPacket.packetID]);
            console.log("stPacket.packetCounter: "+ stPacket.packetCounter);
            if (stPacket.packetCounterFlag) {
                // packetCounter is number of packet of same packet id.
                if (that.ableAssemblyMPUFrag[stPacket.packetID] === stPacket.packetCounter) {
                    console.log("Pushed to assemblyMPUFragId - " + stPacket.packetID);
                    that.assemblyMPUFragId.push(stPacket.packetID);
                }
            }
        }
    }

    getMPUFragment (unconditional) {
        let mpuFrag = null;
        let assemblyMPUFragCnt = this.assemblyMPUFragId.length;

        // MPU Fragment를 만들 수 있을 경우.
        if (assemblyMPUFragCnt > 0) {
            let fragPktId = this.assemblyMPUFragId.find(function findMinId() {
                let i = 0;
                let minId = this.assemblyMPUFragId[0];
                for (i = 1; i<assemblyMPUFragCnt; i++) {
                    if (minId > this.assemblyMPUFragId[i]) {
                        minId = this.assemblyMPUFragId[i];
                    }
                }
                return minId;
            });

            let packetSet = this.udpBuffer.getPacketById(fragPktId);
            if (packetSet !== null) {
                let mpuFragBuf = this.mmtpDepack.makeFragment(packetSet, packetSet.length);
                mpuFrag = this.depayloadizer.depayloadize(mpuFragBuf);
                // mpuFrag.header => mfu header
                // mpuFrag.headerSize => mfu header size
                // mpuFrag.data => payload data
                // mpuFrag.dataSize => payload data size
            }

            return mpuFrag;
        }
        else {
            // 현재 존재하는 packet들로 MPU Fragment를 만들어야 하는 경우
            if (unconditional) {
                return null;
            }
            else {
                return null;
            }
        }
    }

    get port () {
        return this.port_;
    }

    set port (port) {
        this.port_ = port;
    }

    get host () {
        return this.host_;
    }

    set host (host) {
        this.host_ = host;
    }
}
module.exports = mmtpReceiver;