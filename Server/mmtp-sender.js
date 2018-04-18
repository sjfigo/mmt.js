var UDPController = require("../transport/udp-controller");
var FileController = require("../util/file-controller");
var MPUDissolver = require("./../mpu-manager/mpu-dissolver");
var MMTPPacketizer = require("../packet-manager/mmtp-packetizer");
var MPUFragmentType = require("./../mpu-manager/mmt-structure/mpu-fragment-type");
var TimedMediaMFUHeader = require("./../payload-manager/timed-media_MFU");
var NonTimedMediaMFUHeader = require("./../payload-manager/non-timed_media_MFU");
var Payloadizer = require("./../payload-manager/payloadizer");
var DUType = require("./../payload-manager/du-type");

var that = null;

class mmtpSender {
    constructor (id, addr, port, server, greenLight) {
        this.id_ = id;
        this.addr_ = addr;
        this.port_ = port;
        this.server_ = server;
        this.clientAddr_ = server.remoteAddress;
        this.clientPort_ = null;


        this.server_.on("data", this.onRecv);
        
        this.udpSock = new UDPController();
        this.udpSock.onErrorCB = this.onError;

        this.greenLight = greenLight;

        this.mpuPathList = [];

        this.fragmentCnt = 0;
        this.fileController = new FileController();
        this.mmtpPacketizer = new MMTPPacketizer();

        that = this;
    }

    ready () {
        this.udpSock.createUDPSock();
        console.log("bind - start: "+ this.addr_+" "+this.port_);
        this.udpSock.bind(this.addr_, this.port_, this.feedbackPort);
        console.log("bind - end");
        //this.udpSock.sendUDPSock(new Buffer("test"), this.port_, this.addr_);
    }

    onRecv (chunk) {
        // Receve client udp listening port number
        console.log("mmtManager - onRecv - chunk: " +chunk);
        let port = parseInt(chunk.toString());
        if (port !== null && port !== undefined) {
            that.clientPort_ = port;
            if (that.greenLight) {
                console.log("Go to green light");
                that.greenLight(that.id_);
            }
            else {
                console.log("red light");
            }
        }
        /*if (chunk.compare(Buffer.from("mmt hello")) == 0) {
            console.log("recv data is correct");
            if (that.greenLight) {
                console.log("Go to green light");
                that.greenLight(that.id_);
            }
            else {
                console.log("red light");
            }
        }
        else {
            console.log("recv data is not correct.")
        }*/
    }

    onError (err) {
        console.log("mmtManager - onError");
        console.log(err);
    }

    feedbackPort () {
        // send to client about listening port number
        let portBuf = new Buffer(that.udpSock.port.toString());
        console.log("onListen - " + that.udpSock.port.toString()+" - "+portBuf);
        that.server_.write(portBuf);
    }

    addMPUPath (path) {
        console.log("Add path: " + path);
        that.mpuPathList.push(path);
    }

    send () {
        let i = 0;
        let j = 0;
        let k = 0;
        let mpuNum = that.mpuPathList.length;
        let movieFragmentCnt = 0;
        var payloadizer = new Payloadizer(true, true, false, DUType.MPU_Fragment);
        let ret = false;

        console.log("send - begin");
        console.log("Number of MPU - " + mpuNum);
        console.log("port - " + that.clientPort_ + " / addr - " + that.clientAddr_);

        for (i=0; i<mpuNum; i++) {
            // Read MPU
            let mpuPath = that.mpuPathList[i];
            let mpuData = that.fileController.readBinFile(mpuPath);
            console.log("Read MPU finish");

            // MPU Fragmentation
            let mpuDissolver = new MPUDissolver (mpuData, mpuData.length);
            let mpuFrags = mpuDissolver.mpuFragments;
            console.log("MPU fragmentation finish. number of fragment is " + mpuFrags.length);

            let mpuFragCnt = mpuFrags.length;
            for (j=0; j<mpuFragCnt; j++) {
                // Payloadize
                let mpuFrag = mpuFrags[j];
                let mpuFragBuf = null;
                if (mpuFrag.type === MPUFragmentType.moof) {
                    movieFragmentCnt ++;
                }
                
                if (mpuFrag.type === MPUFragmentType.mdat) { // MFU 
                    let mpuFragLen = mpuFrag.data.length;
                    let mfuHeader = null;
                    let mfuHeaderBuf = null;
                    
                    //if timed media {
                        let movie_fragment_sequence_number = movieFragmentCnt; // Sequenc number of moof or mdat
                        let sample_number = 1; // Number of sample in the MFU
                        let offset = 0; // offset of the media data of this MFU
                        let priority = 255; // 0~255, 255 highes
                        let dep_counter = 0; // ??? indicates the number of data units that depend on their media processing upon the media data in this MFU.
                        mfuHeader = new TimedMediaMFUHeader(movie_fragment_sequence_number, sample_number, offset, priority, dep_counter);
                    //}
                    //else if non timed media {
                        //let itemID = 0; // ???
                        //mfuHeader = new NonTimedMediaMFUHeader(itemID);
                    //}

                    mfuHeaderBuf = mfuHeader.make();
                    mpuFragBuf = Buffer.allocUnsafe(mpuFragLen + mfuHeader.totalSize).fill(0x00);
                    mfuHeaderBuf.copy(mpuFragBuf, 0, 0, mfuHeader.totalSize);
                    mpuFrag.data.copy(mpuFragBuf, mfuHeader.totalSize, 0, mpuFragLen);
                    console.log("sender - MPU fragment type is mdat, header size: " + mfuHeader.totalSize + ", data size: " + mpuFragLen + " - " + mpuFragBuf);
                }
                else {
                    mpuFragBuf = mpuFrag.data;
                    console.log("sender - MPU fragment type is " + mpuFrag.type + " - " + mpuFragBuf + " - " + mpuFragBuf.length);
                }

                ret = payloadizer.addDataUnit(mpuFrag.type, mpuFragBuf, i);
                if (ret == false) {
                    console.log("Fail addDataUnit");
                    continue;
                }
                payloadizer.payloadize();
                console.log("Payloadize finish");

                // Packetize
                that.mmtpPacketizer.setFragment(mpuFragBuf, that.fragmentCnt);
                that.fragmentCnt ++;
                console.log("Packetize finish");

                // Send
                let packet = that.mmtpPacketizer.packet;
                while (packet !== null) {
                    //console.log("send packet "+packet);
                    that.udpSock.sendUDPSock(packet, that.clientPort_, that.clientAddr_);
                    packet = that.mmtpPacketizer.packet;
                }
            }
        }

        console.log("send - finish");
    }

    get port () {
        return that.port_;
    }

    get address () {
        return that.addr_;
    }

    set clientAddr (addr) {
        this.clientAddr_ = addr;
    }

    set clientPort (port) {
        this.clientPort_ = port;
    }
}

module.exports = mmtpSender;