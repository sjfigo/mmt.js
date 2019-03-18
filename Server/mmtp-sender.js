var UDPController = require("../transport/udp-controller");
var FileController = require("../util/file-controller");
var MPUDissolver = require("./../mpu-manager/mpu-dissolver");
var MMTPPacketizer = require("../packet-manager/mmtp-packetizer");
var ContentManager = require("./mmt-content-manager");
var MPU_Fragment_Type = require("./../mpu-manager/mmt-structure/mpu-fragment-type");
var FragmentedMPUHeader = require('./../payload-manager/fragmented-mpu-header');
var TimedMediaMFUHeader = require("./../payload-manager/timed-media_MFU");
var NonTimedMediaMFUHeader = require("./../payload-manager/non-timed_media_MFU");
var Payloadizer = require("./../payload-manager/payloadizer");
var DUType = require("./../payload-manager/du-type");

var that = null;
var cnt = 0;
var payloadCnt = 0;
var totalPktSize = 0;

class mmtpSender {
    constructor () {
        console.log("mmtpSender constructor");
        this.id_ = null;
        
        this.localAddr_ = null;
        this.localPort_ = null;
        this.remoteAddr_ = null;
        this.remotePort_ = null;
        
        this.udpSock_ = null;
        this.sockType_ = null;

        this.httpRequest_ = null;
        this.httpResponse_ = null;

        this.tcpServer_ = null;

        this.mpuPathList = [];

        this.payloadCnt = 0;
        this.fileController = new FileController();
        this.mmtpPacketizer = new MMTPPacketizer();
        this.contentManager = new ContentManager();

        this.packetSendDebug = false;
        
        that = this;
    }

    setConnectInfo (id, localAddr, localPort, remoteAddr, remotePort) {
        this.id_ = id;
        this.localAddr_ = localAddr;
        this.localPort_ = localPort;
        this.remoteAddr_ = remoteAddr;
        this.remotePort_ = remotePort;
    }

    get localPort () {
        return this.localPort_;
    }
    set localPort (port) {
        this.localPort_ = port;
    }
    get localAddr () {
        return that.localAddr_;
    }
    set localAddr (addr) {
        this.localAddr_ = addr;
    }

    get remoteAddr () {
        return this.remoteAddr_;
    }
    set remoteAddr (addr) {
        this.remoteAddr_ = addr;
    }
    get remotePort () {
        return this.remotePort_;
    }
    set remotePort (port) {
        this.remotePort_ = port;
    }

    setHttpMsg (req, res) {
        this.httpRequest_ = req;
        this.httpResponse_ = res;

        if (this.sockType_ !== "webrtc") {
            this.sendResponse();
        }
    }

    setTcpServer (server) {
        this.TcpServer_ = server;
        if (server !== null) {
            this.remoteAddr_ = server.remoteAddress;
        }
        if (this.TcpServer_ !== null && this.TcpServer_.on !== undefined) {
            this.TcpServer_.on("data", this.onRecv);
        }
    }

    createStreamSock (sockType) {
        if (!sockType || (!this.httpRequest_ && !this.httpResponse_ && !this.TcpServer_)) {
            return false;
        }

        this.sockType_ = sockType;
        this.udpSock_ = new UDPController(sockType);
        if (this.udpSock_ === null) {
            return;
        }
        this.udpSock_.MediaStreamType = "sender";
        this.udpSock_.onErrorCB = this.onError;

        if (sockType === "webrtc") {
            this.udpSock_.webRtcCandidateListener = this.onNotifyWebRtcCandidate;
        }

        this.udpSock_.createUDPSock();
    }

    onNotifyWebRtcCandidate (candidate) {
        if (that.httpResponse_) {
            let specificResData = "candidate:"+candidate;
            that.sendResponse(specificResData);
        }
    }

    parseHttpReqMsg (key) {
        if (!that.httpRequest_) {
            return null;
        }

        let body = that.httpRequest_.body;
        if (!body) {
            return null;
        }

        let valueStart = body.indexOf(key+":", 0);
        if (valueStart < 0) {
            return null;
        }
        valueStart += (key + ":").length;
        let valueEnd = body.indexOf("|", valueStart);
        if (valueEnd < 0) {
            valueEnd = body.length;
        }
        let value = body.substring(valueStart, valueEnd);
        return value;
    }

    sendResponse (specificResData) {
        let resBody = "port:"+that.localPort_;
        let assetId = that.parseHttpReqMsg("asset-id");

        if (assetId) {
            let id = parseInt(assetId, 10);
            let asset = that.contentManager.getAsset(id);
            resBody += "|asset:" + asset;
        }
        
        that.httpResponse_.statusCode = 200;
        
        if (specificResData) {
            resBody += ("|WebRTC-Candidate:"+specificResData);
        }

        if (that.httpRequest_ && that.httpRequest_.client._peername.address === that.localAddr_) { // Set-Cookie is not support caused CORS at same device.
            resBody += ("|Channel-Number:"+that.id_);
        }
        else {
            that.httpResponse_.setHeader("Set-Cookie", "Channel-Number="+that.id_);
        }
        that.httpResponse_.setHeader("Content-Length", resBody.length);
        that.httpResponse_.setHeader("Content-Type", "video/mmt");
        
        that.httpResponse_.write(Buffer.from(resBody));
        console.log("Headers: ");
        console.log(that.httpResponse_._headers);
        console.log("Body: " + resBody);
        that.httpResponse_.end();
    }

    ready () {
        console.log("bind - start: "+ this.localAddr_+" "+this.localPort_);
        this.udpSock_.bind(this.localAddr_, this.localPort_, this.feedbackPort);
        console.log("bind - end");
        //this.udpSock_.sendUDPSock(new Buffer("test"), this.localPort_, this.localAddr_);
    }

    onRecv (chunk) {
        // Receve client udp listening port number
        console.log("mmtManager - onRecv - chunk: " +chunk);
        let port = parseInt(chunk.toString());
        if (port !== null && port !== undefined) {
            that.remotePort_ = port;
            if (that.greenLight) {
                console.log("Go to green light");
                that.greenLight(that.id_);
            }
            else {
                console.log("red light");
            }
        }
    }

    greenLight (req, res) {
        console.log("green light");
        let assetId = 0;
        let asset = null;
        
        if(this.TcpServer_) {
            if (req.headers["asset-id"]) {
                assetId = parseInt(req.headers["asset-id"]);
            }
            asset = this.contentManager.getAsset(assetId);
            
            console.log("asset: " + asset);
        }
        else if((this.httpRequest_ || this.httpResponse_) && req) {
            let reqAssetId = req.body.indexOf("Asset-ID:");
            if (reqAssetId >= 0) {
                let assetIdStart = reqAssetId + "Asset-ID:".length;
                let assetIdEnd = req.body.indexOf("|", assetIdStart);
                if (assetIdEnd < 0) {
                    assetIdEnd = req.body.length;
                }
                assetId = parseInt(req.body.substring(assetIdStart, assetIdEnd));
                asset = this.contentManager.getAsset(assetId);
            }
        }

        if (asset) {
            if ((this.httpRequest_ || this.httpResponse_) && res) {
                that.ready();
            
                let resBody = "OK Streaming begin!";
                res.statusCode == 200;
                if (req.client._peername.address !== that.localAddr_) { // Set-Cookie is not support caused CORS at same device.
                    res.setHeader("Set-Cookie", "Channel-Number="+channelNumber);
                }
                res.setHeader("Content-Length", resBody.length);
                res.setHeader("Content-Type", "video/mmt");
                
                res.write(Buffer.from(resBody));
                console.log("Headers: ");
                console.log(res._headers);
                console.log("Body: " + resBody);
                res.end();
            }
            that.begin(asset);
        }
        else {
            if ((this.httpRequest_ || this.httpResponse_)) {
                res.statusCode = 404;
                res.end();
            }
        }
    }

    onError (err) {
        console.log("mmtManager - onError" + err);
    }

    feedbackPort () {
        // send to client about listening port number
        let portBuf = new Buffer(that.udpSock_.port.toString());
        console.log("onListen - " + that.udpSock_.port.toString()+" - "+portBuf);
        that.server_.write(portBuf);
    }

    begin (asset) {
        let i = 0;
        console.log("MMT Server begin!!! - "+asset.length);
        for (i=0; i<asset.length; i++) {
            let mpuPath = asset [i];
            that.addMPUPath(mpuPath);
        }
        that.send();
    }

    addMPUPath (path) {
        console.log("Add path: " + path);
        that.mpuPathList.push(path);
    }

    send () {
        let i = 0;
        let mpuNum = that.mpuPathList.length;

        //console.log("send - begin");
        //console.log("Number of MPU - " + mpuNum);
        //console.log("port - " + that.remotePort_ + " / addr - " + that.remoteAddr_);

        for (i=0; i<mpuNum; i++) {
            // Read MPU
            let mpuPath = that.mpuPathList[i];
            let mpuData = that.fileController.readBinFile(mpuPath);
            //console.log("Read MPU finish");

            setTimeout(this.sendNextMPU, i*3000, mpuData, i, true);
        }
    }

    sendNextMPU (mpuData, mpuNum, timed) {
        let j = 0;
        let movieFragmentCnt = 0;
        var payloadizer = new Payloadizer(true, true, false, DUType.MPU_Fragment);
        let ret = false;
        let sentPackets = new FileController();
        let outPayloads = new FileController();

        console.log("mpu seq num: " + mpuNum);

        // MPU Fragmentation
        let mpuDissolver = new MPUDissolver (mpuData, mpuData.length);
        let mpuFrags = mpuDissolver.mpuFragments;
        if (cnt === 0) {
            console.log("Server - first mpu fragment: " + mpuFrags[0].data);
        }
        cnt++;
        //console.log("MPU fragmentation finish. number of fragment is " + mpuFrags.length);

        let mpuFragCnt = mpuFrags.length;
        for (j=0; j<mpuFragCnt; j++) {
            // Payloadize
            let iterator = 0;
            let mpuFrag = mpuFrags[j];
            let mpuFragBuf = null;
            let mpuFragLen = mpuFrag.data.length;
            let fragmentedMPUHeader = new FragmentedMPUHeader(mpuFrag.type, timed);
            let fragmentedMPUHeaderBuf = fragmentedMPUHeader.make();

            if (mpuFrag.type === MPU_Fragment_Type.Movie_Fragment_Metadata) {
                movieFragmentCnt ++;
            }
            
            if (mpuFrag.type === MPU_Fragment_Type.MFU) { 
                let mfuHeader = null;
                let mfuHeaderBuf = null;
                
                if (timed === true) {
                    let movie_fragment_sequence_number = movieFragmentCnt; // Sequence number of moof or mdat
                    let sample_number = 1; // Number of sample in the MFU
                    let offset = 0; // offset of the media data of this MFU
                    let priority = 255; // 0~255, 255 highes
                    let dep_counter = 0; // ??? indicates the number of data units that depend on their media processing upon the media data in this MFU.
                    mfuHeader = new TimedMediaMFUHeader(movie_fragment_sequence_number, sample_number, offset, priority, dep_counter);
                    mfuHeaderBuf = mfuHeader.make();
                }
                else {
                    let itemID = 0; // ???
                    mfuHeader = new NonTimedMediaMFUHeader(itemID);
                    mfuHeaderBuf = mfuHeader.make();
                }
                
                mpuFragBuf = Buffer.allocUnsafe(fragmentedMPUHeader.length + mfuHeader.totalSize + mpuFragLen).fill(0x00);
                fragmentedMPUHeaderBuf.copy(mpuFragBuf, 0, iterator, fragmentedMPUHeader.length);
                iterator += fragmentedMPUHeader.length;
                mfuHeaderBuf.copy(mpuFragBuf, iterator, 0, mfuHeader.totalSize);
                iterator += mfuHeader.totalSize;
                mpuFrag.data.copy(mpuFragBuf, iterator, 0, mpuFragLen);
                iterator += mpuFragLen;
                //console.log("sender - MPU fragment type is mdat, header size: " + mfuHeader.totalSize + ", data size: " + mpuFragLen);
            }
            else {
                mpuFragBuf = Buffer.allocUnsafe(fragmentedMPUHeader.length + mpuFragLen).fill(0x00);
                fragmentedMPUHeaderBuf.copy(mpuFragBuf, 0, iterator, fragmentedMPUHeader.length);
                iterator += fragmentedMPUHeader.length;
                mpuFrag.data.copy(mpuFragBuf, iterator, 0, mpuFragLen);
                iterator += mpuFragLen;
                //console.log("sender - MPU fragment type is " + mpuFrag.type + " - " + mpuFragBuf.length);
            }

            ret = payloadizer.addDataUnit(mpuFrag.type, mpuFragBuf, mpuNum);
            if (ret == false) {
                console.log("Fail addDataUnit");
                continue;
            }
            payloadizer.payloadize();
            //console.log("Payloadize finish");

            let payload = payloadizer.payload;
            while (payload !== null){
                if (that.packetSendDebug === true) {
                    outPayloads.writeBinFile("./Server/payloads/payload-"+payloadCnt+".log", payload.payload);
                    payloadCnt++;
                }
                // Packetize
                that.mmtpPacketizer.setFragment(payload.payload, that.payloadCnt);
                that.payloadCnt ++;

                payload = payloadizer.payload;
            }
            console.log("Packetize finish");

            // Send
            let packet = that.mmtpPacketizer.packet;
            while (packet !== null) {
                //console.log("send packet "+packet);
                totalPktSize += packet.data.length;
                that.udpSock_.sendUDPSock(packet.data, that.remotePort_, that.remoteAddr_);
                if (that.packetSendDebug === true) {
                    sentPackets.writeBinFile("./Server/packets/packet-"+packet.seq+".log", packet.data);
                    packetCnt++;
                }
                
                packet = that.mmtpPacketizer.packet;
            }
        }
        console.log("Total packet size: " + totalPktSize);
    }
}

module.exports = mmtpSender;