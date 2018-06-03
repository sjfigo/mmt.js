var UdpController = require("../transport/udp-controller");
var UDPBuffer = require("../util/udp-buffer");
var mmtpDepacketizer = require("../packet-manager/mmtp-depacketizer");
var Depayloadizer = require("../payload-manager/depayloadizer");
var MPURebuilder = require("../mpu-manager/mpu-rebuilder");
var FileController = require("../util/file-controller");
var payloadCnt = 0;
var packetCnt = 0;

var that = null;

class mmtpReceiver {
    constructor (host, port, client, cbPostMPU) {
        this.port_ = port;
        this.host_ = host;
        this.client_ = client;
        this.sock = new UdpController();
        this.sock.onRecvCB = this.onRecv;

        //this.recvPackets = [];
        //this.recvPacketIteraotr = 0;

        this.mmtpDepack = new mmtpDepacketizer();
        this.depayloadizer = new Depayloadizer();
        this.mpuRebuilder = new MPURebuilder(cbPostMPU);
        this.udpBuffer = new UDPBuffer();

        this.ableAssemblyMPUFrag = [];
        this.assemblyMPUFragId = [];

        this.prePacketId = 0;

        this.rebuilderInterval = null;
        this.noFragCnt = 0;

        this.recvPackets = new FileController();
        this.outPayloads = new FileController();

        this.packetRecvDebug = false;

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

        that.rebuilderInterval = setInterval(that.pushMpuFragmentToMpuRebuilder, 100);
    }

    onRecv (packet, info) {
        //console.log("Recv packet - size: " + info.size);
        that.mmtpDepack.packet = packet;
        if (that.packetRecvDebug === true) {
            that.recvPackets.writeBinFile("./Client/packets/packet-"+packetCnt+".log", packet);
            packetCnt++;
        }

        let stPacket = that.mmtpDepack.packet;
        if (stPacket !== null) {
            that.udpBuffer.setPacket(stPacket, stPacket.packetSequenceNumber);
            
            if (that.prePacketId < stPacket.packetID) {
                console.log("Pushed to assemblyMPUFragId - " + that.prePacketId);
                that.assemblyMPUFragId.push(that.prePacketId);
                that.prePacketId = stPacket.packetID;
            }
        }
    }

    pushMpuFragmentToMpuRebuilder () {
        console.log("pushMpuFragmentToMpuRebuilder - begin");
        let mpuFrag = that.getMPUFragment(false);
        if (mpuFrag !== null && mpuFrag !== undefined) {
            that.mpuRebuilder.mpuFrag = mpuFrag;
        }
        else {
            that.noFragCnt ++;
            if (that.noFragCnt > 100) {
                console.log("pushMpuFragmentToMpuRebuilder - clear");
                clearInterval(that.rebuilderInterval);
            }
        }
        console.log("pushMpuFragmentToMpuRebuilder - end");
    }

    unconditionalPushMpuFragmentToMpuRebuilder () {
        let mpuFrag = that.getMPUFragment(true);
        while (mpuFrag !== null && mpuFrag !== undefined) {
            that.mpuRebuilder.mpuFrag = mpuFrag;
            mpuFrag = that.getMPUFragment(true);
        }
    }

    getMPUFragment (unconditional) {
        let mpuFrag = null;
        let assemblyMPUFragCnt = that.assemblyMPUFragId.length;

        // MPU Fragment를 만들 수 있을 경우.
        if (assemblyMPUFragCnt > 0) {
            /*let fragPktId = that.assemblyMPUFragId.find(function findMinId() {
                let i = 0;
                let minId = that.assemblyMPUFragId[0];
                for (i = 1; i<assemblyMPUFragCnt; i++) {
                    if (minId > that.assemblyMPUFragId[i]) {
                        minId = that.assemblyMPUFragId[i];
                    }
                }
                return minId;
            });*/
            let fragPktId = Math.min.apply(Math, that.assemblyMPUFragId);
            console.log("fragPktId: " + fragPktId);
            let packetSet = that.udpBuffer.getPacketById(fragPktId);
            if (packetSet !== null) {
                let mpuFragBuf = that.mmtpDepack.makeFragment(packetSet, packetSet.length);
                if (that.packetRecvDebug === true) {
                    that.outPayloads.writeBinFile("./Client/payloads/payload-"+payloadCnt+".log", mpuFragBuf);
                    payloadCnt++;
                }
                mpuFrag = that.depayloadizer.depayloadize(mpuFragBuf);

                let i = 0;
                for(i=0; i<that.assemblyMPUFragId.length; i++) {
                    if (that.assemblyMPUFragId[i] === fragPktId) {
                        that.assemblyMPUFragId.splice(i, 1);
                        break;
                    }
                }

                return mpuFrag.data; // -> mpuFrag 구조 확인 for Rebuilder --> Refer to mpu-fragment.js
            }
            else {
                return null;
            }
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