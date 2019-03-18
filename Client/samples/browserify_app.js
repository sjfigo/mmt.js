(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (Buffer){
const TCP_SERVER = 1;
const HTTP_SERVER = 2;

var serverType = HTTP_SERVER;
var ServerListenProtocol = null;

var TcpController = require("../transport/tcp-controller");
var mmtpReceiver = require("./mmtp-receiver");
var FileController = require("../util/file-controller");
var MSEController = require("./src/stream/mse-controller.js");
var BrowserCode = require("./src/browser-code.js");

var that = null;

class mmtClient {
    constructor (video, browserCode) {
        if (serverType === TCP_SERVER) {
            this.client = new TcpController();
            this.client.onRecvCB = this.onCallSetupRecv;
            this.client.onErrorCB = this.onCallSetupError;
            this.client.onEndCB = this.onCallSetupEnd;
            this.client.onTimeoutCB = this.onCallSetupTimeout;
            this.client.onConnectedCB = this.onCallSetupConnected;
        }
        else if (serverType === HTTP_SERVER) {
            this.client = new XMLHttpRequest();
        }

        this.serverCallSetupAddr = null;
        this.serverCallSetupPort = 0;

        this.channelList = [];

        this.browserCode = new BrowserCode();
        this.usingBrowserCode = browserCode;

        this.fileController = new FileController();
        this.fileCnt = 0;

        if (video != null) {
            this._mseController = new MSEController();
            this._video = video;
            this._video.src = URL.createObjectURL(this._mseController.mse);
            this._commonMimeCodec = "video/mp4; codecs=\"avc1.640028\"";
        }

        that = this;
    }

    callSetupConnect (host, port) {
        console.log("callSetupConnect - " + host + " : " + port);
        this.serverCallSetupAddr = host;
        this.serverCallSetupPort = port;

        if (serverType === TCP_SERVER) {
            this.client.createClient(host, port, this.usingBrowserCode);
        }
        else if (serverType === HTTP_SERVER) {
            let reqBody = "";
            this.client.open("POST", /*host*/"http://"+host+":"+port.toString()+"/callsetup/ready", true);
            this.client.responseType = "arraybuffer";
            switch (this.usingBrowserCode) {
                case this.browserCode.chrome:
                case this.browserCode.firefox:
                case this.browserCode.opera:
                    reqBody += "stream-socket:webrtc|";
                    break;
                default:
                    reqBody += "stream-socket:node|";
            }
            reqBody += "asset-id:0|";
            reqBody += "recv-port:"+port.toString()+"|";
            this.client.onload = this.onCallSetupRecv;
            this.client.send(reqBody);
        }
    }

    onCallSetupRecv (param) {
        let port = null;
        let host = null;
        let httpChannelNum = null;
        let httpSetCookieSupport = false;
        let selectAssetId = 0;
        let webRtcCandidate = null;
        
        if (serverType === TCP_SERVER) {
            let buf = param;
            console.log(buf);
            
            port = parseInt(buf.toString());
            host = that.serverCallSetupAddr;
            console.log("host: "+that.serverCallSetupAddr);
            console.log("port: "+port);
        }
        else if (serverType === HTTP_SERVER) {
            let resHeaders = param.target.getAllResponseHeaders();
            let parsedPos = 0;
            if (!resHeaders) {
                return false;
            }
            if (resHeaders.indexOf("Set-Cookie") >= 0) {
                let start = resHeaders.indexOf("Set-Cookie", 0) + "Set-Cookie".length + 1;
                let end = resHeaders.indexOf("\r\n", start);
                let channelNumStart = resHeaders.indexOf("Channel-Number=", start) + "Channel-Number=".length;

                httpSetCookieSupport = true;

                if (channelNumStart < end) {
                    httpChannelNum = parseInt(resHeaders.substring(channelNumStart, end), 10);
                }
            }
            let resBody = Buffer.from(param.target.response).toString("utf8");
            let portStart = resBody.indexOf("port:", 0, "utf-8");
            if (portStart < 0) {
                return false;
            } 
            portStart += "port:".length;
            parsedPos = portStart;
            let portEnd = resBody.indexOf("|", portStart, "utf-8");
            if (portStart >= 0 && portEnd >= 0) {
                port = resBody.substring(portStart, portEnd);
                parsedPos = portEnd;
            }
            else {
                console.log("Unknown server sending port number");
                return false;
            }
            let assetInfo = null;
            let assetInfoStart = resBody.indexOf("asset:", parsedPos);
            if (assetInfoStart >= 0) {
                assetInfoStart += "asset:".length;
                let assetInfoEnd = resBody.indexOf("|", assetInfoStart);
                if (assetInfoEnd < 0) {
                    assetInfoEnd = resBody.length;
                }        
                parsedPos = assetInfoEnd;
                assetInfo = resBody.substring(assetInfoStart, assetInfoEnd);
            }
            selectAssetId = 0;

            let webRtcCandidateStart = resBody.indexOf("WebRTC-Candidate:", parsedPos);
            if (webRtcCandidateStart >= 0) {
                webRtcCandidateStart += "WebRTC-Candidate:".length;
                let webRtcCandidateEnd = resBody.indexOf("|", webRtcCandidateStart);
                if (!webRtcCandidateEnd < 0) {
                    webRtcCandidateEnd = resBody.length;
                }
                parsedPos = webRtcCandidateEnd;
                webRtcCandidate = resBody.substring(webRtcCandidateStart, webRtcCandidateEnd);
            }

            if (!httpSetCookieSupport) {
                let channelNumStart = resBody.indexOf("Channel-Number:", parsedPos);
                if (channelNumStart >= 0) {
                    channelNumStart += "Channel-Number:".length;
                    let channelNumEnd = resBody.indexOf("|", channelNumStart);
                    if (channelNumEnd < 0) {
                        channelNumEnd = resBody.length;
                    }
                    httpChannelNum = parseInt(resBody.substring(channelNumStart, channelNumEnd), 10);
                    parsedPos = channelNumEnd;
                }
            }
            host = that.serverCallSetupAddr;

            console.log(param.target);
        }
        
        let receiver = new mmtpReceiver(host, 0, that.client, that.onRecvMPU, that.getUdpSockType());
        if (webRtcCandidate) {
            receiver.remoteWebRtcCandidate(webRtcCandidate);
        }
        receiver.ready();
        
        let channel = {
            host: host,
            port: port,
            mediaReceiver: receiver
        };
        that.channelList.push(channel);

        if (serverType === HTTP_SERVER) {
            let reqBody = "";
            
            console.log("CallSetup - start");
            that.client.open("POST", /*host*/"http://192.168.1.12:1337/callsetup/start", true);
            
            if (httpSetCookieSupport) {
                that.client.setRequestHeader("cookie","Channel-Number="+httpChannelNum);
            }
            else {
                reqBody += "Channel-Number:"+httpChannelNum;
            }

            if (selectAssetId !== null) {
                reqBody += "|Asset-ID:"+selectAssetId;
            }
            that.client.responseType = "arraybuffer";
            that.client.onload = null;
            that.client.send(reqBody);
        }
    }

    onCallSetupError (err) {
        console.log(err);
    }

    onCallSetupEnd () {
        console.log("mmtClient onEnd");
    }

    onCallSetupTimeout () {
        console.log("mmtClient onTimeout");
    }

    onCallSetupConnected () {
        console.log("mmtClient onConnected");
    }

    onRecvMPU (mpu) {
        // Pass to MSE
        //that.fileController.writeBinFile("./Client/output/00"+that.fileCnt.toString()+".mp4", mpu.data);
        that.fileCnt++;

        if (this._mseController.mse.readyState === "open") {
            this._mseController.appendSegment(this._commonMimeCodec, mpu.data);
        }

        if (that.fileCnt == 1) {
            that.video.play();
        }
    }

    setBrowserCode (isOpera, isFirefox, isSafari, isIE, isEdge, isChrome, isBlink) {
        if (isOpera) {
            this.usingBrowserCode = this.browserCode.opera;
            console.log("Browser is Opera");
        }
        else if (isFirefox) {
            this.usingBrowserCode = this.browserCode.firefox;
            console.log("Browser is Firefox");
        }
        else if (isSafari) {
            this.usingBrowserCode = this.browserCode.safari;
            console.log("Browser is Safari");
        }
        else if (isIE) {
            this.usingBrowserCode = this.browserCode.ie;
            console.log("Browser is IE");
        }
        else if (isEdge) {
            this.usingBrowserCode = this.browserCode.edge;
            console.log("Browser is Edge");
        }
        else if (isChrome) {
            this.usingBrowserCode = this.browserCode.chrome;
            console.log("Browser is Chrome");
        }
        else if (isBlink) {
            this.usingBrowserCode = this.browserCode.blink;
            console.log("Browser is Blink");
        }
    }

    getUdpSockType () {
        let udpSockType = "unknown";

        if (that.usingBrowserCode == this.browserCode.node) {
            udpSockType = "dgram";
        }
        else if (that.usingBrowserCode == this.browserCode.chrome
                || that.usingBrowserCode == this.browserCode.opera
                || that.usingBrowserCode == this.browserCode.firefox) {
            udpSockType = "webrtc";
        }
        return udpSockType;
    }
}
module.exports = mmtClient;

/*var client = new mmtClient (null);
client.callSetupConnect("::ffff:127.0.0.1", 8124);*/
}).call(this,require("buffer").Buffer)
},{"../transport/tcp-controller":28,"../util/file-controller":31,"./mmtp-receiver":2,"./src/browser-code.js":4,"./src/stream/mse-controller.js":5,"buffer":35}],2:[function(require,module,exports){
(function (Buffer){
var UdpController = require("../transport/udp-controller");
var UDPBuffer = require("../util/udp-buffer");
var mmtpDepacketizer = require("../packet-manager/mmtp-depacketizer");
var Depayloadizer = require("../payload-manager/depayloadizer");
var MPURebuilder = require("../mpu-manager/mpu-rebuilder");
var FileController = require("../util/file-controller");
var Dequeue = require("dequeue");
var FIFO = new Dequeue();
var payloadCnt = 0;

var that = null;

class mmtpReceiver {
    constructor (host, port, client, cbPostMPU, udpSockType) {
        this.port_ = port;
        this.host_ = host;
        this.client_ = client;
        
        this.sock = new UdpController(udpSockType);
        if (this.sock === null) {
            return null;
        }
        this.sock.MediaStreamType = "receiver";
        this.sock.createUDPSock();
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
        this.composeFragment = false;

        that = this;
    }

    ready () {
        console.log("bind - start: "+ this.host_+" "+this.port_);
        this.sock.bind(this.host_, this.port_, this.sayHello);
        console.log("bind - end");
    }

    sayHello () {
        console.log("sayHello - remote: "+that.host_+", "+that.port_+", local: "+that.sock.port);
        //this.sock.sendUDPSock(Buffer.from("mmt hello"), this.port_, this.host_);
        let portBuf = new Buffer(that.sock.port.toString());
        that.client_.send(portBuf);

        that.rebuilderInterval = setInterval(that.pushMpuFragmentToMpuRebuilder, 1000);
    }

    onRecv (packet, info) {
        console.log("Recv packet - size: " + info.size);
        FIFO.push(packet);
    }

    packetDequeue () {
        let dequeue = false;
        if (that.noFragCnt < 50) {
            while(FIFO.length > 0) {
                let packet = FIFO.shift();
                that.mmtpDepack.packet = packet;

                let stPacket = that.mmtpDepack.packet;
                if (stPacket !== null) {
                    if (that.packetRecvDebug === true) {
                        that.recvPackets.writeBinFile("./Client/packets/packet-"+stPacket.packetSequenceNumber+".log", packet);
                    }
                    that.udpBuffer.setPacket(stPacket, stPacket.packetSequenceNumber);
                    
                    if (that.prePacketId < stPacket.packetID) {
                        console.log("Pushed to assemblyMPUFragId - " + that.prePacketId);
                        that.assemblyMPUFragId.push(that.prePacketId);
                        that.prePacketId = stPacket.packetID;
                    }
                }
                dequeue = true;
            }
        }
        return dequeue;
    }

    pushMpuFragmentToMpuRebuilder () {
        console.log("pushMpuFragmentToMpuRebuilder - begin");

        if (that.composeFragment === false) {
            that.composeFragment = true;

            if (that.packetDequeue() === false) {
                return false;
            }

            let mpuFrag = that.getMPUFragment(false);
            while (mpuFrag !== null) {
                if (mpuFrag !== null && mpuFrag !== undefined) {
                    that.mpuRebuilder.mpuFrag = mpuFrag;
                }
                else {
                    that.noFragCnt ++;
                    if (that.noFragCnt > 50) {
                        console.log("pushMpuFragmentToMpuRebuilder - clear");
                        clearInterval(that.rebuilderInterval);
                    }
                }
                mpuFrag = that.getMPUFragment(false);
            }
            that.composeFragment = false;
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

                return mpuFrag; // -> mpuFrag 구조 확인 for Rebuilder --> Refer to mpu-fragment.js
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

    set remoteWebRtcCandidate (candidate) {
        if (this.sock) {
            this.sock.remoteWebRtcCandidate = candidate;
        }
    }
}
module.exports = mmtpReceiver;
}).call(this,require("buffer").Buffer)
},{"../mpu-manager/mpu-rebuilder":14,"../packet-manager/mmtp-depacketizer":21,"../payload-manager/depayloadizer":23,"../transport/udp-controller":29,"../util/file-controller":31,"../util/udp-buffer":32,"buffer":35,"dequeue":16}],3:[function(require,module,exports){
var MMTPlayer = require("../mmt-client.js");
var BrowserCode = require("../src/browser-code.js");

/**
 * The application layer of the test application.
 * @class
 */
var app = function() {};
/**
 * The video element owned by the app.
 *
 * @private {HTMLVideoElement}
 */
app.video = null;

/**
 * The player object owned by the app.
 *
 * @private {NexWebPlayer}
 */
app.player = null;

/**
 * The content url (mpd or m3u8)
 *
 * @private {http url string}
 */
app.server_ip = "192.168.1.12";
app.server_port = 1337;


/**
 * Initializes the application.
 */
app.init = function() {  
  app.video = 
      /** @type {!HTMLVideoElement} */ (document.getElementById("videoTag"));

  var browserCode = new BrowserCode(window, document);

  app.player = new MMTPlayer(app.video, browserCode.currentBrowserCode);
  app.player.callSetupConnect(app.server_ip, app.server_port);
};

if (document.readyState == "complete" ||
    document.readyState == "interactive") {
  app.init();
} else {
  document.addEventListener("DOMContentLoaded", app.init);
}
},{"../mmt-client.js":1,"../src/browser-code.js":4}],4:[function(require,module,exports){
class BrowserCode {
    constructor (window, document) {
        this._window = window;
        this._document = document;

        this._node = 0;
        this._opera = 1;
        this._firefox = 2;
        this._safari = 3;
        this._ie = 4;
        this._edge = 5;
        this._chrome = 6;
        this._blink = 7;
    }

    get currentBrowserCode() {
        let browserCode = this._node;
        let isIE = false;
        let isChrome = false;
        let isOpera = false;

        // Opera 8.0+
        if ((!!this._window.opr && !!this._window.opr.addons) || !!this._window.opera || navigator.userAgent.indexOf(" OPR/") >= 0) {
            browserCode = this._opera;
            isOpera = true;
        }
        // Firefox 1.0+
        if (typeof InstallTrigger !== "undefined") {
            browserCode = this._firefox;
        }
        // Safari 3.0+ "[object HTMLElementConstructor]" 
        if (/constructor/i.test(this._window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!this._window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification))) {
            browserCode = this._safari;
        }
        // Internet Explorer 6-11
        if (/*@cc_on!@*/false || this._document.documentMode) {
            browserCode = this._ie;
            isIE = true;
        }
        // Edge 20+
        if (!isIE && this._window.StyleMedia) {
            browserCode = this._edge;
        }
        if (this._window.chrome) {
            browserCode = this._chrome;
            isChrome = true;
        }
        
        return browserCode;
    }

    get node () {
        return this._node;
    }
    get opera () {
        return this._opera;
    }
    get firefox () {
        return this._firefox;
    }
    get safari () {
        return this._safari;
    }
    get ie () {
        return this._ie;
    }
    get edge () {
        return this._edge;
    }
    get chrome () {
        return this._chrome;
    }
    get blink () {
        return this._blink;
    }

    getBrowserName (code) {
        switch(code) {
            case this._chrome:
                return "chrome";
            case this._safari:
                return "safari";
            case this._node:
                return "node";
            case this._opera:
                return "opera";
            case this._firefox:
                return "firefox";
            case this._ie:
                return "ie";
            case this._edge:
                return "edge";
            case this._blink:
                return "blink";
            default:
                return null;
        }
    }
}
module.exports = BrowserCode;
},{}],5:[function(require,module,exports){
//var Error = require("../error.js").Error;

class MSEController {
    constructor() {
        if("MediaSource" in window) {
            this._mse = new MediaSource;
            this._mimeCodecs = [];
        }
    }

    get mse () {
        return this._mse;
    }

    addSourceBuffer (mimeCodec) {
        if (!this._mimeCodecs[mimeCodec]) {
            let sourceBuffer = this._mse.addSourceBuffer(mimeCodec);
            this._mimeCodecs[mimeCodec] = sourceBuffer;
        }
    }

    createSourceBuffer (mimeCodec) {
        if (this._mse && MediaSource.isTypeSupported(mimeCodec)) {
            this._mse.addEventListener("sourceopen", this.addSourceBuffer.bind(this, mimeCodec));
        }
    }
    
    appendSegment (mimeCodec, segment) {
        if (this._mse) {
            if (!this._mimeCodecs[mimeCodec]) {
                return 0;//Error.INVALID_PARAM;
            }
            let sourceBuffer = this._mimeCodecs[mimeCodec];
            let arrayBuffer = new ArrayBuffer(segment);
            sourceBuffer.appendBuffer(arrayBuffer);
        }
    }
}

module.exports = MSEController;
},{}],6:[function(require,module,exports){
class AssetID {
    constructor () {
        this.scheme = null;
        this.length = null;
        this.value = null;
    }

    get scheme () {
        return this.scheme;
    }
    set scheme (scheme) {
        this.scheme = scheme;
    }
    get length () {
        return this.length;
    }
    set length (length) {
        this.length = length;
    }
    get value () {
        return this.value;
    }
    set value (value) {
        this.value = value;
    }
}
module.exports = AssetID;
},{}],7:[function(require,module,exports){
var AssetType = {
    non_timed : 0x00,
    timed : 0x01,
}
module.exports = AssetType;
},{}],8:[function(require,module,exports){
class MFU {
    constructor() {
        this._mfu_num = 0;
        this._next_mfu_num = 0;
        this._offset = 0;
        this._length = 0;
        this._video_sample_count = 0;
        this._video_sample_size_offset = 0;
        this._video_sample_size_seek_num = 0;
        this._video_sample_offset = 0;
        this._hint_sample_offset = 0;
    }
    get mfu_num () {
        return this._mfu_num;
    }
    set mfu_num (num) {
        this._mfu_num = num;
    }
    get next_mfu_num () {
        return this._next_mfu_num;
    }
    set next_mfu_num (num) {
        this._next_mfu_num = num;
    }
    get offset () {
        return this._offset;
    }
    set offset (offset) {
        this._offset = offset;
    }
    get length () {
        return this._length;
    }
    set length (length) {
        this._length = length;
    }
    get video_sample_count () {
        return this._video_sample_count;
    }
    set video_sample_count (cnt) {
        this._video_sample_count = cnt;
    }
    get video_sample_size_offset () {
        return this._video_sample_size_offset;
    }
    set video_sample_size_offset (offset) {
        this._video_sample_size_offset = offset;
    }
    get video_sample_size_seek_num () {
        return this._video_sample_size_seek_num;
    }
    set video_sample_size_seek_num (num) {
        this._video_sample_size_seek_num = num;
    }
    get video_sample_offset () {
        return this._video_sample_offset;
    }
    set video_sample_offset (offset) {
        this._video_sample_offset = offset;
    }
    get hint_sample_offset () {
        return this._hint_sample_offset;
    }
    set hint_sample_offset (offset) {
        this._hint_sample_offset = offset;
    }
}
module.exports = MFU;
},{}],9:[function(require,module,exports){
class moofMetadata {
    constructor() {
        this.firstMoofFlag = true;
        //this.moofOffset = 0;
        this.mdatOffset = 0;
        this.mdatSize = 0;
    }
    get first_moof_flag () {
        return this.firstMoofFlag;
    }
    set first_moof_flag (flag) {
        this.firstMoofFlag = flag;
    }
    /*get moof_offset () {
        return this.moofOffset;
    }
    set moof_offset (offset) {
        this.moofOffset = offset;
    }*/
    get mdat_offset () {
        return this.mdatOffset;
    }
    set mdat_offset (offset) {
        this.mdatOffset = offset;
    }
    get mdat_size () {
        return this.mdatSize;
    }
    set mdat_size (size) {
        this.mdatSize = size;
    }
}
module.exports = moofMetadata;
},{}],10:[function(require,module,exports){
var MPU_Fragment_Type = {
    Movie_Fragment_Metadata : 0x00,    // moof and mdat header
    MPU_Metadata : 0x01,    // ftyp, mmpu, moov
    MFU : 0x02     // mdat samples and sub-samples
}
module.exports = MPU_Fragment_Type;
},{}],11:[function(require,module,exports){
(function (Buffer){
class MPUFragment {
    constructor (type, data, size) {
        this.mpufType = null;
        this.mpufData =  Buffer.from("");
        this.mpufSize = null;
        this.mpufPosition = null;
        this.mpufTypeInfo = null; // MPU Metadata Info, MOOF Metadata Info or MFU Info
        if (type !== undefined) {
            this.mpufType = type;
        }
        if (data !== undefined) {
            this.mpufData = Buffer.from(data);
        }
        if (size !== undefined) {
            this.mpufSize = size;
        }
    }

    get type () {
        return this.mpufType;
    }
    set type (type) {
        this.mpufType = type;
    }
    get data () {
        return this.mpufData;
    }
    set data (data) {
        this.mpufData = data;
    }
    get size () {
        return this.mpufSize;
    }
    set size (size) {
        this.mpufSize = size;
    }
    get position () {
        return this.mpufPosition;
    }
    set position (pos) {
        this.mpufPosition = pos;
    }
    get typeInfo () {
        return this.mpufTypeInfo;
    }
    set typeInfo (info) {
        this.mpufTypeInfo = info;
    }
}
module.exports = MPUFragment;
}).call(this,require("buffer").Buffer)
},{"buffer":35}],12:[function(require,module,exports){
class MPUMetadata {
    constructor() {
        this.moovOffset = 0;
        this.videoTrakId = 0;
        this.hintTrakId = 0;
        this.assetType = 0;
    }
    get moov_offset () {
        return this.moovOffset;
    }
    set moov_offset (offset) {
        this.moovOffset = offset;
    }
    /*get video_trak_id () {
        return this.videoTrakId;
    }
    set video_trak_id (id) {
        this.videoTrakId = id;
    }
    get hint_trak_id () {
        return this.hintTrakId;
    }
    set hint_trak_id (id) {
        this.hintTrakId = id;
    }*/
    get asset_type () {
        return this.assetType;
    }
    set asset_type (type) {
        this.assetType = type;
    }
}
module.exports = MPUMetadata;
},{}],13:[function(require,module,exports){
(function (Buffer){
class MPU {
    constructor (data, size) {
        if (data !== undefined) {
            this.mpuData = data;
        }
        else {
            this.mpuData = Buffer.from("");
        }
        this.allocSize = 0;
        this.descriptor_ = 0;
        if (size !== undefined) {
            this.mpuDataSize = size;
        }
        else {
            this.mpuDataSize = 0;
        }
        this.mpu_num = null;
        this.mpuMetaDataFlag = false;
        this.assetType = null;
        this.moovOffset = null;
        this.videoTrakId = null;
        this.hintTrakId = null;
        this.videoSampleCount = 0;
        this.videoSampleSizeOffset = null;
        this.moofOffset = null;
        this.videoSampleSizeSeekNum = null;
        this.videoSampleOffset = null;
        this.hintSampleOffset = null;
    }
    get descriptor () {
        return this.descriptor_;
    }
    set descriptor (des) {
        this.descriptor_ = des;
    }
    get data () {
        return this.mpuData;
    }
    set data (data) {
        this.mpuData = data;
    }
    get alloc_size () {
        return this.allocSize;
    }
    set alloc_size (size) {
        this.allocSize = size;        
    }
    get dataSize () {
        return this.mpuDataSize;
    }
    set dataSize (size) {
        this.mpuDataSize = size;
    }
    get mpu_number () {
        return this.mpu_num;
    }
    set mpu_number (number) {
        this.mpu_num = number;
    }
    get mpu_metadata_flag () {
        return this.mpuMetaDataFlag;
    }
    set mpu_metadata_flag (flag) {
        this.mpuMetaDataFlag = flag;
    }
    get asset_type () {
        return this.assetType;
    }
    set asset_type (type) {
        this.assetType = type;
    }
    get moov_offset () {
        return this.moovOffset;
    }
    set moov_offset (moov_offset) {
        this.moovOffset = moov_offset;
    }
    get video_trak_id () {
        return this.videoTrakId;
    }
    set video_trak_id (video_trak_id) {
        this.videoTrakId = video_trak_id;
    }
    get hint_trak_id () {
        return this.hintTrakId;
    }
    set hint_trak_id (hint_trak_id) {
        this.hintTrakId = hint_trak_id;
    }
    get video_sample_count () {
        return this.videoSampleCount;
    }
    set video_sample_count (video_sample_count) {
        this.videoSampleCount = video_sample_count;
    }
    get moof_offset () {
        return this.moofOffset;
    }
    set moof_offset (moof_offset) {
        this.moofOffset = moof_offset;
    }
    get video_sample_size_offset () {
        return this.videoSampleSizeOffset;
    }
    set video_sample_size_offset ( video_sample_size_offset) {
        this.videoSampleSizeOffset = video_sample_size_offset;
    }
    get video_sample_size_seek_num () {
        return this.videoSampleSizeSeekNum;
    } 
    set video_sample_size_seek_num (video_sample_size_seek_num) {
        this.videoSampleSizeSeekNum = video_sample_size_seek_num;
    }
    get video_sample_offset () {
        return this.videoSampleOffset;
    }
    set video_sample_offset (video_sample_offset) {
        this.videoSampleOffset = video_sample_offset;
    }
    get hint_sample_offset () {
        return this.hintSampleOffset;
    }
    set hint_sample_offset (hint_sample_offset) {
        this.hintSampleOffset = hint_sample_offset;
    }
}
module.exports = MPU;
}).call(this,require("buffer").Buffer)
},{"buffer":35}],14:[function(require,module,exports){
(function (Buffer){
var MPU = require("./mmt-structure/mpu.js");
var MPUFragment = require("./mmt-structure/mpu-fragment.js");
var AssetID = require("./mmt-structure/asset-id.js");
var MPU_Fragment_Type = require("./mmt-structure/mpu-fragment-type.js");
var moofMetadata = require("./mmt-structure/moof-metadata.js");
var MPUMetadata = require("./mmt-structure/mpu-metadata.js");
var MFU = require("./mmt-structure/mfu.js");
var AssetType = require("./mmt-structure/asset-type.js");

class MPURebuilder {
    constructor (cbPostMPU) {
        this.mpu = new MPU();
        this.mpuFrags = [];
        this.composedFragNum = 0;
        this.postMPU = cbPostMPU;
        this.moofMetadata = new moofMetadata();
        this.lastMpuSize = 0;
        this.concatedFrags = [];
        this.lastMfuNum = 0;
    }

    /**
     * Set received MPU fragment data
     * @param {* MPUFragment} frag
     */
    set mpuFrag (frag) {
        let mpuFrag = frag;

        console.log("Set mpuFrag size: "+mpuFrag.size);
        console.log("Set mpuFrag type: "+mpuFrag.type);

        console.log("compose begin");
        if(this.postMPU !== null && this.postMPU !== undefined) {
            console.log(this.postMPU);
            if (mpuFrag.type === MPU_Fragment_Type.MPU_Metadata && this.mpu.dataSize !== undefined && this.mpu.dataSize > 0) {
                //this.concatenateMPUFrags();
                console.log("MPU number: " + this.mpu.mpu_number)
                this.postMPU(this.mpu);
                this.reset();
            }
        }
        else {
            console.log("postMPU problem.")
        }

        this.composeMPUFrags(mpuFrag);
    }

    reset () {
        this.mpu = new MPU();
        this.mpuFrags.splice(0, this.mpuFrags.length);
        this.composedFragNum = 0;
        this.lastMpuSize = 0;
        this.moofMetadata = new moofMetadata();
        this.concatedFrags.splice(0, this.concatedFrags.length);
        this.lastMfuNum = 0;
    }

    resolve () {
        if(this.postMPU !== null && this.postMPU !== undefined) {
            console.log(this.postMPU);
            //this.concatenateMPUFrags();
            this.postMPU(this.mpu);
        }
        else {
            console.log("postMPU problem.")
        }
    }

    /**
     * Return 4 bytes Buffer object read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    get4ByteBuffer (buf, offset) {
        const len = 4;
        let resultBuffer = Buffer.allocUnsafe(len).fill(0x00);
        let ret = buf.copy(resultBuffer, 0, offset, offset + len);

        return resultBuffer;
    }

    /**
     * Return integer read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo4ByteBuffer (buf, offset) {
        let result = (buf.readUInt8(offset + 0) & 0xFF) << 24 | (buf.readUInt8(offset + 1) & 0xFF) << 16 | (buf.readUInt8(offset + 2) & 0xFF) << 8 | (buf.readUInt8(offset + 3) & 0xFF);
        return result;
    }

    /**
     * Return integer read 3 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo3ByteBuffer (buf, offset) {
        let result = (buf.readUInt8(offset + 0) & 0xFF) << 16 | (buf.readUInt8(offset + 1) & 0xFF) << 8 | (buf.readUInt8(offset + 2) & 0xFF);
        return result;
    }


    bufferCopy (target, targetPosition, data, dataPosition, dataLength) {
        let targetLength = target.length;
        let size = targetPosition + dataLength;
        let resultBuffer = null;

        if (target === undefined || targetLength > size) {
            resultBuffer = Buffer.allocUnsafe(targetLength).fill(0x00);
            target.copy(resultBuffer, 0, 0, targetLength);
            data.copy(resultBuffer, targetPosition, dataPosition, dataPosition + dataLength);
            return resultBuffer;
        }
        else {
            let resultSize = size;
            resultBuffer = Buffer.allocUnsafe(resultSize).fill(0x00);
            target.copy(resultBuffer, 0, 0, targetLength);
            data.copy(resultBuffer, targetPosition, dataPosition, dataPosition + dataLength);
        
            return resultBuffer;
        }
    }

    /**
     * Set the data to the position of MPU
     * @param {*Number} position 
     * @param {*Buffer} data 
     * @param {*Number} dataPos 
     * @param {*Number} dataSize 
     */
    setMPUFragPos (position, data, dataPos, dataSize) {
        if (dataSize > 0) {//position이 잘못됬다!!
            /*if (this.mpu.allocSize < dataPos + dataSize) {
                if (this.mpu.allocSize === 0) {
                    this.mpu.allocSize = dataPos + dataSize;
                    let allocSize = this.mpu.allocSize * 2;
                    this.mpu.data = Buffer.allocUnsafe(allocSize).fill(0x00);
                    this.mpu.alloc_size = allocSize;
                    this.mpu.data = this.bufferCopy(this.mpu.data, position, data, dataPos, dataSize);
                }
                else {
                    let allocSize = this.mpu.allocSize;
                    do {
                        allocSize += this.mpu.allocSize;
                    } while (allocSize < dataPos + dataSize);
                    let mpuData = Buffer.allocUnsafe(allocSize).fill(0x00);
                    this.bufferCopy(mpuData, 0, this.mpu.data, 0, this.mpu.allocSize);
                    this.bufferCopy(mpuData, position, data, dataPos, dataSize);

                    this.mpu.data = Buffer.allocUnsafe(allocSize).fill(0x00);
                    this.bufferCopy(this.mpu.data, 0, mpuData, 0, allocSize);
                    this.mpu.alloc_size = allocSize;
                }
            }
            else {*/
            this.mpu.data = this.bufferCopy(this.mpu.data, position, data, dataPos, dataSize);
            //}
            if (this.mpu.dataSize < dataPos + dataSize) {
                this.mpu.dataSize = dataPos + dataSize;
            }
            /*console.log("setMPUFragPos - Put mpuFrags to [" + position.toString() + "]");
            this.mpuFrags[position.toString()] = Buffer.allocUnsafe(dataSize).fill(0x00);
            this.mpuFrags[position.toString()] = this.bufferCopy(this.mpuFrags[position.toString()], 0, data, dataPos, dataSize);
            this.mpu.dataSize = this.mpu.dataSize + dataSize;*/
        }
        else {
            console.log("setMPUFragPos - DataSize is less then 0.");
        }
    }

    concatenateMPUFrags () {
        let i = 0;
        let strIterator = "0";
        let ret = false;

        if (this.mpuFrags.length === 0) {
            return ret;
        }

        if (this.mpu.dataSize > 0) {
            ret = true;
            if (this.lastMpuSize < this.mpu.dataSize) {
                if (this.mpu.data.length === 0) {
                    this.mpu.data = Buffer.allocUnsafe(this.mpu.dataSize).fill(0x00);
                }
                else {
                    let tempBuffer = Buffer.allocUnsafe(this.mpu.dataSize).fill(0x00);
                    if (this.lastMpuSize > 0) {
                        this.mpu.data = this.bufferCopy(tempBuffer, 0, this.mpu.data, 0, this.lastMpuSize);
                    }
                }
                this.lastMpuSize = this.mpu.dataSize;
            }

            while (this.mpuFrags[strIterator] !== undefined && this.mpuFrags[strIterator].length > 0) {
                let length = this.mpuFrags[strIterator].length;
                if (!this.concatedFrags.includes(i)) {
                    this.mpu.data = this.bufferCopy(this.mpu.data, i, this.mpuFrags[strIterator], 0, this.mpuFrags[strIterator].length);
                    //this.mpuFrags.splice(strIterator, 1);
                    this.concatedFrags.push(i);
                }

                i += length;
                strIterator = i.toString();
            }

            if (i !== this.mpu.dataSize) {
                ret = false;
            }
        }

        return ret;
    }

    getMPUFragType (data, size) {
        let ftyp = Buffer.from("ftyp");
        let ftypLen = ftyp.length;
        let moof = Buffer.from("moof");
        let moofLen = moof.length;
        let mdat = Buffer.from("mdat");
        let mdatLen = mdat.length;

        if (size > 8) {
            let boxName = this.get4ByteBuffer(data, 4);
            if (boxName.compare(ftyp) === 0) {
                return MPU_Fragment_Type.MPU_Metadata;
            }
            else if (boxName.compare(moof) === 0) {
                return MPU_Fragment_Type.Movie_Fragment_Metadata;
            }
            else if (boxName.compare(mdat) === 0) {
                return MPU_Fragment_Type.MFU;
            }
        }
    }

    composeMPUFrags (mpuFrag) {
        let ret = false;

        let mmpu = Buffer.from("mmpu");
        let moov = Buffer.from("moov");
        
        if (mpuFrag.type === MPU_Fragment_Type.MPU_Metadata) {
            let iterator = 0;
            console.log("mpuFrag.length: " + mpuFrag.data.length);
            let boxName = this.get4ByteBuffer(mpuFrag.data, iterator + 4);

            let mpuMeta = new MPUMetadata();

            console.log("(find mmpu1) boxName: "+boxName);
            while(boxName.compare(mmpu) !== 0) {
                iterator += this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                boxName = this.get4ByteBuffer(mpuFrag.data, iterator + 4);
                console.log("(find mmpu2) boxName: "+boxName);
            }
            mpuMeta.mpu_num = this.getIntTo4ByteBuffer(mpuFrag.data, iterator +13);
            console.log("mpuMeta.mpu_num: "+mpuMeta.mpu_num);

            boxName = this.get4ByteBuffer(mpuFrag.data, iterator + 4);
            console.log("(find moov1) boxName: "+boxName);
            while(boxName.compare(moov) !== 0) {
                iterator += this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                boxName = this.get4ByteBuffer(mpuFrag.data, iterator + 4);
                console.log("(find moov2) boxName: "+boxName);
            }
            mpuMeta.moov_offset = iterator;
            console.log("mpuMeta.moov_offset: " + mpuMeta.moov_offset);
            mpuFrag.typeInfo = mpuMeta;

            ret = this.setMPUMetadata(mpuFrag);
        }
        else if (mpuFrag.type === MPU_Fragment_Type.Movie_Fragment_Metadata) {
            ret = this.setMoofMetadata(mpuFrag);
        }
        else if (mpuFrag.type === MPU_Fragment_Type.MFU) {
            let iterator = 0;
            let mfu = new MFU();
            mfu.mfu_num = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.mfu_num: "+mfu.mfu_num);
            let temp = this.get4ByteBuffer(mpuFrag.data, iterator+4);
            console.log("mfu.type: "+temp);
            iterator += 11;
            mfu.offset = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.offset: "+mfu.offset);
            iterator += 4;
            mfu.length = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.length: "+mfu.length);
            
            mpuFrag.typeInfo = mfu;
            ret = this.setMFU(mpuFrag);
        }
        else {
            // Error.
            ret = false;
            //break;
        }
        //}

        return ret;
    }

    // MPU의 사이즈를 미리 알 수 있나? spec확인
    // 일단 compose 해보자
    setMPUMetadata (mpuFrag) {
        let moov_size = 0;
        let moov_pos = 0;

        let boxName = null;
        let boxSize = 0;

        let trak = Buffer.from("trak");
        let trakLen = trak.length;
        let tkhd = Buffer.from("tkhd");
        let tkhdLen = tkhd.length;
        let mdia = Buffer.from("mdia");
        let mdiaLen = mdia.length;
        let hdlr = Buffer.from("hdlr");
        let hdlrLen = hdlr.length;
        let vide = Buffer.from("vide");
        let videLen = vide.length;
        let hint = Buffer.from("hint");
        let hintLen = hint.length;
        let mmth = Buffer.from("mmth");
        let mmthLen = mmth.length;

        //this.bufferCopy(this.mpu.data, this.mpu.descriptor, mpuFrag.data, 0, mpuFrag.size);
        this.setMPUFragPos(this.mpu.descriptor, mpuFrag.data, 0, mpuFrag.size);
        this.mpu.descriptor += mpuFrag.size;

        //this.mpu.descriptor += mpuFrag.size;
        this.mpu.mpu_meta_flag = true;

        // Begin of GetTrackIdinRebuilder
        moov_size = this.getIntTo4ByteBuffer(mpuFrag.data, mpuFrag.typeInfo.moov_offset);
        console.log("moov_size: "+moov_size);
        moov_pos = mpuFrag.typeInfo.moov_offset + 8;

        while (moov_pos < moov_size) {
            boxSize = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
            moov_pos += 4;
            boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);
            if (boxName.compare(trak) === 0) {
                let trakId = null;
                let trakSize = boxSize;
                let trakSubBoxOffset = 0;

                moov_pos += 4;
                trakSubBoxOffset = moov_pos;
                trakSize -=8;

                while (trakSize > 0) {
                    let tsbSize = 0;
                    tsbSize = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
                    moov_pos += 4;
                    boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);
                    moov_pos += 4;
                    if (boxName.compare(tkhd) === 0) {
                        //let version = Buffer.from(mpu.data, moov_pos, 1) & 0xFF;/**/
                        let version = Buffer.allocUnsafe(1).fill(0x00);
                        version = this.bufferCopy(version, 0, mpuFrag.data, moov_pos, 1);
                        version &= 0xFF;

                        if (version === 1) {
                            moov_pos += 28;
                        }
                        else {
                            moov_pos += 12;
                        }

                        trakId = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
                        break;
                    }
                    else {
                        moov_pos += (tsbSize - 4);
                    }
                    trakSize -= tsbSize;
                }

                trakSize = boxSize;
                moov_pos = trakSubBoxOffset;
                trakSize -= 8;

                while (trakSize > 0) {
                    let tsbSize = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
                    moov_pos += 4;
                    boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);
                    if (boxName.compare(mdia) === 0) {
                        let mdiaSize = tsbSize - 8;
                        moov_pos += 4;
                        console.log("mdiaSize1: "+mdiaSize);
                        while (mdiaSize > 0) {
                            let msbSize = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
                            console.log("msbSize: "+msbSize);
                            moov_pos += 4;
                            boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);                            
                            if(boxName.compare(hdlr) === 0) {
                                moov_pos += 12;
                                boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);
                                if (boxName.compare(vide) === 0) {
                                    this.mpu.video_trak_id = trakId;
                                }
                                else if(boxName.compare(hint) === 0) {
                                    this.mpu.hint_trak_id = trakId;
                                }
                                trakSubBoxOffset -= 4;
                                break;
                            }
                            moov_pos += (msbSize - 4);
                            mdiaSize -= msbSize;
                            console.log("mdiaSize2: "+mdiaSize);
                        }
                        break;
                    }
                    else {
                        moov_pos += (tsbSize - 4);
                    }
                    trakSize -= tsbSize;
                }
                moov_pos = trakSubBoxOffset;
            }
            moov_pos += (boxSize - 4);
        }
        moov_pos = mpuFrag.data.indexOf(mmth);
        moov_pos += 18;
        this.mpu.asset_type = (mpuFrag.data[moov_pos] & 0x40) >> 6;
        // End of GetTrackIdinRebuilder

        if (this.mpu.video_trak_id !== null && this.mpu.hint_trak_id !== null) {
            return true;
        }
        else {
            return false;
        }
    }

    setMoofMetadata (mpuFrag) {
        if (this.moofMetadata.first_moof_flag) {
            this.moofMetadata.first_moof_flag = 0;
        }
        else {
            this.mpu.descriptor = this.moofMetadata.mdat_offset + this.moofMetadata.mdat_size;
        }

        this.setMPUFragPos(this.mpu.descriptor, mpuFrag.data, 0, mpuFrag.size);

        console.log("--- setMoofMetadata ---");
        console.log("this.mpu.descriptor: " + this.mpu.descriptor);
        console.log("mpuFrag.size: " + mpuFrag.size);
        this.mpu.moof_offset = this.mpu.descriptor;
        this.mpu.descriptor += mpuFrag.size;
        this.moofMetadata.mdat_offset = this.mpu.descriptor - 8;
        console.log("this.moofMetadata.mdat_offset: " + this.moofMetadata.mdat_offset);
        this.moofMetadata.mdat_size = this.getIntTo4ByteBuffer(mpuFrag.data, mpuFrag.size-8);
        this.mpu.video_sample_count = 0;
        this.lastMfuNum = 0;

        return true;
    }

    setMFU (mpuFrag) {
        let hintSampleSize = 4;

        if (this.mpu.asset_type === 1) {
            hintSampleSize += 26;
        }
        else {
            hintSampleSize += 2;
        }

        if (mpuFrag.typeInfo.mfu_num !== this.lastMfuNum) {//mpuFrag.typeInfo.next_mfu_num) {
            while (mpuFrag.typeInfo.mfu_num > this.lastMfuNum) {//mpuFrag.typeInfo.next_mfu_num) {
                //mmte_khu1_GetSampleOffsetinRebuilder
                this.getSampleOffset(mpuFrag);
                //mpuFrag.typeInfo.next_mfu_num++;
                this.lastMfuNum++;
            }
        }
        else {
            //mmte_khu1_GetSampleOffsetinRebuilder
            this.getSampleOffset(mpuFrag);
        }

        console.log("this.mpu.video_sample_offset: "+this.mpu.video_sample_offset);
        console.log("this.mpu.hint_sample_offset: "+this.mpu.hint_sample_offset);
        
        this.setMPUFragPos(this.mpu.hint_sample_offset, mpuFrag.data, 0, hintSampleSize);
        this.setMPUFragPos(this.mpu.video_sample_offset, mpuFrag.data, hintSampleSize, mpuFrag.size - hintSampleSize);

        return true;
    }


    getSampleOffset (mpuFrag) {
        //console.log("---getSampleOffset---");
        //console.log("this.mpu.descriptor: " + this.mpu.descriptor);
        //console.log("this.mpu.moof_offset: "+this.mpu.moof_offset);
        let iterator = 0;

        let boxName = null;
        let msbSize = 0;
        let traf = Buffer.from("traf");
        let trafLen = traf.length;
        let tfhd = Buffer.from("tfhd");
        let tfhdLen = tfhd.length;
        let trun = Buffer.from("trun");
        let trunLen = trun.length;
        let moofboxsize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.moof_offset);
        let moof = Buffer.allocUnsafe(moofboxsize).fill(0x00);//this.mpuFrags[this.mpu.moof_offset.toString()];
        moof = this.bufferCopy(moof, 0, this.mpu.data, this.mpu.moof_offset, moofboxsize);
        moofboxsize -= 8;
        if (this.mpu.video_sample_count === 0) {
            
            iterator += 8;

            console.log("moofboxsize: " + moofboxsize);

            while (moofboxsize > 0) {
                msbSize = this.getIntTo4ByteBuffer(moof, iterator);
                iterator += 4;

                console.log("msbSize: " + msbSize);

                boxName = this.get4ByteBuffer(moof, iterator);
                if (boxName.compare(traf) === 0) {
                    iterator += 4;
                    let trafSize = msbSize;
                    let tsbPtr = iterator;
                    let tSize = trafSize - 8;
                    let tfhdFlags = false;
                    let trafId = null;
                    let baseDataOffset = 0;
                    let tsbSize = 0;

                    while (tSize > 0) {
                        tsbSize = this.getIntTo4ByteBuffer(moof, iterator);
                        iterator += 4;

                        boxName = this.get4ByteBuffer(moof, iterator);
                        if (boxName.compare(tfhd) === 0) {
                            iterator += 4;

                            let tfhdPrt = iterator;
                            tfhdFlags = this.getIntTo3ByteBuffer(moof, iterator+1);
                            iterator += 4;
                            trafId = this.getIntTo4ByteBuffer(moof, iterator);
                            iterator += 4;

                            if (tfhdFlags & 0x01) {
                                baseDataOffset = this.getIntTo4ByteBuffer(moof, iterator);
                                iterator += 4;
                                baseDataOffset = baseDataOffset << 32 | this.getIntTo4ByteBuffer(moof, iterator);
                                iterator += 4;
                            }
                            else {
                                baseDataOffset = this.mpu.moof_offset;
                            }

                            iterator = tfhdPrt;
                            break;
                        }
                        iterator += (tsbSize - 4);
                        tSize -= tsbSize;
                    }

                    iterator = tsbPtr;
                    tSize = trafSize - 8;

                    while (tSize > 0) {
                        tsbSize = this.getIntTo4ByteBuffer(moof, iterator);
                        iterator += 4;

                        boxName = this.get4ByteBuffer(moof, iterator);
                        if (boxName.compare(trun) === 0) {
                            iterator += 4;
                            break;
                        }
                        iterator += (tsbSize - 4);
                        tSize -= tsbSize;
                    }

                    if (trafId === this.mpu.video_trak_id) {
                        let flags = null;
                        let sample_count = 0;
                        let data_offset = 0;
                        let skipNum = 0;
                        let sizeValuePtr = 0;

                        flags = this.getIntTo3ByteBuffer(moof, iterator + 1);
                        iterator += 4;
                        sample_count = this.getIntTo4ByteBuffer(moof, iterator);
                        iterator += 4;

                        if (flags & 0x01) {
                            data_offset = this.getIntTo4ByteBuffer(moof, iterator);
                            iterator += 4;
                        }
                        if (flags & 0x04) {
                            iterator += 4;
                        }

                        skipNum = 0;
                        if (flags & 0x100) {
                            iterator += 4;
                            skipNum += 4;
                        }
                        if (flags & 0x200) {
                            sizeValuePtr = iterator;
                            skipNum += 4;
                        }
                        if (flags & 0x400) {
                            skipNum += 4;
                        }
                        if (flags & 0x800) {
                            skipNum += 4;
                        }

                        this.mpu.video_sample_count = sample_count;
                        this.mpu.video_sample_size_offset = sizeValuePtr;// + this.mpu.moof_offset;
                        this.mpu.video_sample_size_seek_num = skipNum;
                        this.mpu.video_sample_offset = baseDataOffset + data_offset;
                    }
                    
                    if(trafId === this.mpu.hint_trak_id) {
                        iterator += 8;
                        let data_offset = this.getIntTo4ByteBuffer(moof, iterator);
                        iterator += 4;

                        this.mpu.hint_sample_offset = baseDataOffset + data_offset;
                        //this.mpu.hint_sample_offset = baseDataOffset + data_offset;
                    }

                    iterator = tsbPtr - 4;
                }
                iterator += msbSize - 4;
                moofboxsize -= msbSize;
            }
        }
        else {
            let video_sample_size = 0;
            let hint_sample_size = 0;

            iterator = this.mpu.video_sample_size_offset;
            if (moof.length < iterator + 4) {
                return 0;
            }
            video_sample_size = this.getIntTo4ByteBuffer(moof, iterator);
            iterator += 4;

            hint_sample_size = 4;
            if (this.mpu.asset_type === AssetType.timed) {
                hint_sample_size += 26;
            }
            else {
                hint_sample_size += 2;
            }

            this.mpu.video_sample_size_offset += this.mpu.video_sample_size_seek_num;
            this.mpu.video_sample_offset += video_sample_size;
            this.mpu.hint_sample_offset += hint_sample_size;
        }
    }
}
module.exports = MPURebuilder;

var postRebuild = function (mpu) {
    fileController.writeBinFile(path, mpu.data);
};

/*
var FileController = require("../Client/util/file-controller.js");
var fileController = new FileController();
var mpu_path = "/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/000.mp4";
var mpuData = fileController.readBinFile(mpu_path);
if (mpuData === null) {
    console.log("1 - NULL");
}
var mpuRebuilder = new MPURebuilder();
mpuRebuilder.mpuFrag = mpuData;
*/
}).call(this,require("buffer").Buffer)
},{"./mmt-structure/asset-id.js":6,"./mmt-structure/asset-type.js":7,"./mmt-structure/mfu.js":8,"./mmt-structure/moof-metadata.js":9,"./mmt-structure/mpu-fragment-type.js":10,"./mmt-structure/mpu-fragment.js":11,"./mmt-structure/mpu-metadata.js":12,"./mmt-structure/mpu.js":13,"buffer":35}],15:[function(require,module,exports){

var Dequeue = exports = module.exports = function Dequeue() {
  this.head = new Node()
  this.length = 0
}

Dequeue.prototype.push = function(d){
  var n = new Node(d)
  this.head.prepend(n)
  this.length += 1
  return this
}

Dequeue.prototype.unshift = function(d){
  var n = new Node(d)
  this.head.append(n)
  this.length += 1
  return this
}

Dequeue.prototype.pop = function(){
  if (this.head.prev === this.head) return
  var n = this.head.prev.remove()
  this.length -= 1
  return n.data
}

Dequeue.prototype.shift = function(){
  if (this.head.next === this.head) return
  var n = this.head.next.remove()
  this.length -= 1
  return n.data
}

Dequeue.prototype.last = function(){
  if (this.head.prev === this.head) return
  return this.head.prev.data
}

Dequeue.prototype.first = function(){
  if (this.head.next === this.head) return
  return this.head.next.data
}

Dequeue.prototype.empty = function(){
  if (this.length === 0 ) return

  //no node points to head; not necessary for GC, but it makes me feel better.
  this.head.next.prev = null
  this.head.prev.next = null

  //head only points to itself; as a fresh node would
  this.head.next = this.head
  this.head.prev = this.head
  
  this.length = 0

  return
}
function Node(d) {
  this.data = d
  this.next = this
  this.prev = this
}

Node.prototype.append = function(n) {
  n.next = this.next
  n.prev = this
  this.next.prev = n
  this.next = n
  return n
}

Node.prototype.prepend = function(n) {
  n.prev = this.prev
  n.next = this
  this.prev.next = n
  this.prev = n
  return n
}

Node.prototype.remove = function() {
  this.next.prev = this.prev
  this.prev.next = this.next
  return this
}
},{}],16:[function(require,module,exports){
exports = module.exports = require("./dequeue")
},{"./dequeue":15}],17:[function(require,module,exports){
var _global = (function() { return this; })();
var NativeWebSocket = _global.WebSocket || _global.MozWebSocket;
var websocket_version = require('./version');


/**
 * Expose a W3C WebSocket class with just one or two arguments.
 */
function W3CWebSocket(uri, protocols) {
	var native_instance;

	if (protocols) {
		native_instance = new NativeWebSocket(uri, protocols);
	}
	else {
		native_instance = new NativeWebSocket(uri);
	}

	/**
	 * 'native_instance' is an instance of nativeWebSocket (the browser's WebSocket
	 * class). Since it is an Object it will be returned as it is when creating an
	 * instance of W3CWebSocket via 'new W3CWebSocket()'.
	 *
	 * ECMAScript 5: http://bclary.com/2004/11/07/#a-13.2.2
	 */
	return native_instance;
}
if (NativeWebSocket) {
	['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function(prop) {
		Object.defineProperty(W3CWebSocket, prop, {
			get: function() { return NativeWebSocket[prop]; }
		});
	});
}

/**
 * Module exports.
 */
module.exports = {
    'w3cwebsocket' : NativeWebSocket ? W3CWebSocket : null,
    'version'      : websocket_version
};

},{"./version":18}],18:[function(require,module,exports){
module.exports = require('../package.json').version;

},{"../package.json":19}],19:[function(require,module,exports){
module.exports={
  "_from": "websocket",
  "_id": "websocket@1.0.28",
  "_inBundle": false,
  "_integrity": "sha512-00y/20/80P7H4bCYkzuuvvfDvh+dgtXi5kzDf3UcZwN6boTYaKvsrtZ5lIYm1Gsg48siMErd9M4zjSYfYFHTrA==",
  "_location": "/websocket",
  "_phantomChildren": {},
  "_requested": {
    "type": "tag",
    "registry": true,
    "raw": "websocket",
    "name": "websocket",
    "escapedName": "websocket",
    "rawSpec": "",
    "saveSpec": null,
    "fetchSpec": "latest"
  },
  "_requiredBy": [
    "#USER",
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/websocket/-/websocket-1.0.28.tgz",
  "_shasum": "9e5f6fdc8a3fe01d4422647ef93abdd8d45a78d3",
  "_spec": "websocket",
  "_where": "/Users/daehee/Git/MMT-WebPlayer",
  "author": {
    "name": "Brian McKelvey",
    "email": "theturtle32@gmail.com",
    "url": "https://github.com/theturtle32"
  },
  "browser": "lib/browser.js",
  "bugs": {
    "url": "https://github.com/theturtle32/WebSocket-Node/issues"
  },
  "bundleDependencies": false,
  "config": {
    "verbose": false
  },
  "contributors": [
    {
      "name": "Iñaki Baz Castillo",
      "email": "ibc@aliax.net",
      "url": "http://dev.sipdoc.net"
    }
  ],
  "dependencies": {
    "debug": "^2.2.0",
    "nan": "^2.11.0",
    "typedarray-to-buffer": "^3.1.5",
    "yaeti": "^0.0.6"
  },
  "deprecated": false,
  "description": "Websocket Client & Server Library implementing the WebSocket protocol as specified in RFC 6455.",
  "devDependencies": {
    "buffer-equal": "^1.0.0",
    "faucet": "^0.0.1",
    "gulp": "git+https://github.com/gulpjs/gulp.git#4.0",
    "gulp-jshint": "^2.0.4",
    "jshint": "^2.0.0",
    "jshint-stylish": "^2.2.1",
    "tape": "^4.9.1"
  },
  "directories": {
    "lib": "./lib"
  },
  "engines": {
    "node": ">=0.10.0"
  },
  "homepage": "https://github.com/theturtle32/WebSocket-Node",
  "keywords": [
    "websocket",
    "websockets",
    "socket",
    "networking",
    "comet",
    "push",
    "RFC-6455",
    "realtime",
    "server",
    "client"
  ],
  "license": "Apache-2.0",
  "main": "index",
  "name": "websocket",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/theturtle32/WebSocket-Node.git"
  },
  "scripts": {
    "gulp": "gulp",
    "install": "(node-gyp rebuild 2> builderror.log) || (exit 0)",
    "test": "faucet test/unit"
  },
  "version": "1.0.28"
}

},{}],20:[function(require,module,exports){
'use strict';

exports.MediaStream = window.MediaStream;
exports.RTCIceCandidate = window.RTCIceCandidate;
exports.RTCPeerConnection = window.RTCPeerConnection;
exports.RTCSessionDescription = window.RTCSessionDescription;

},{}],21:[function(require,module,exports){
(function (Buffer){
var mmtpPacket = require("./mmtp-packet");
var cnt1 = 0;

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
            if (packet === null || packet === undefined) {
                let a = 0 ;
            }
            else {
                totalSize += packet.payload_data.length;
            }
        }
        fragment = Buffer.allocUnsafe(totalSize).fill(0x00);
        for (i=0; i<count; i++) {
            packet = packetSet[i];
            packetLen = packet.payload_data.length;
            packet.payload_data.copy(fragment, fragIterator, 0, packetLen);
            fragIterator += packetLen;
        }

        if (cnt1 === 0) {
            console.log("Client - first mpu fragment: " + fragment);
        }
        cnt1++;

        return fragment;
    }

    depacketize (pktBuf) {
        let packet = new mmtpPacket ();
        let iterator = 0;
        let payloadEnd = pktBuf.length;

        let flags = pktBuf.readUInt16BE(iterator);
        packet.version = (flags & 0xC000) >>> 14;
        packet.packetCounterFlag = (flags & 0x2000) >>> 13;
        packet.fecType = (flags & 0x1800) >>> 11;
        packet.privateUserDataFlag = (flags & 0x0400) >>> 10;
        packet.extensionFlag = (flags & 0x0200) >>> 9;
        iterator += 2;

        packet.packetID = pktBuf.readUInt16BE(iterator);
        iterator += 2;

        packet.packetSequenceNumber = pktBuf.readUInt32BE(iterator);
        console.log("depacketizer - packet id - " + packet.packetID + " / packet seq num - "+packet.packetSequenceNumber);
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
            payloadEnd -= 8;
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
}).call(this,require("buffer").Buffer)
},{"./mmtp-packet":22,"buffer":35}],22:[function(require,module,exports){
class mmtpPacket {
    constructor(V,                          // 2bits, version
                C,                          // 1bit, packet counter flag
                FEC,                        // 2bits, FEC type
                P,                          // 1bit, private user data flag
                E,                          // 1bit, Extension flag
           //   RES,                        // 10bits, Reserved
                packet_id,                  // 16bits, packet ID (Mapped with Asset ID by MPT signaling msg)
                packet_sequence_number,     // 32bits, packet sequence number (In same packet ID)
                timestamp,                  // 32bits, NTP time stamp
                packet_counter,             // 32bits, counting MMT packet at send. (Related not with Asset.)
                private_user_data,          // 16bits, private user data
                payload_data,               // payload data
                source_FEC_payload_ID,      // 32bits, use only AL-FEC (FEC type is 1)

                ext_type,                   // 16bits, extension, user defined type
                ext_length,                 // 16bits, extension, user defined length
                ext_header_extension_value  // 32bits, extension, user defined length
                ) {
        this.V_ = V;
        this.C_ = C;
        this.FEC_ = FEC;
        this.P_ = P;
        this.E_ = E;
        this.RES_ = 0x00;
        this.packet_id_ = packet_id;
        this.packet_sequence_number_ = packet_sequence_number;
        this.timestamp_ = timestamp;
        this.packet_counter_ = packet_counter;
        this.private_user_data_ = private_user_data;
        this.payload_data_ = payload_data;
        this.source_FEC_payload_ID_ = source_FEC_payload_ID;

        this.ext_type_ = ext_type;
        this.ext_length_ = ext_length;
        this.ext_header_extension_value_ = ext_header_extension_value;
    }

    get MTU () {
        return 1500;
    }

    get headerSize () {
        return (this.versionBits + 
                this.packetCounterFlagBits + 
                this.fecTypeBits +
                this.privateUserDataFlagBits +
                this.extensionFlagBits +
                this.reservedBits +
                (this.packetIDBytes * 8) +
                (this.packetSequenceNumberBytes * 8) +
                (this.timestampBytes * 8) + 
                (this.packetCounterBytes * 8) +
                (this.private_user_dataBytes * 8) + 
                (this.source_FEC_payload_ID_Bytes * 8) +
                (this.extTypeBytes * 8) +
                (this.extLengthBytes * 8) +
                (this.ext_header_extension_valueBytes * 8)) / 8;
    }

    set version (v) {
        this.V_ = v;
    }
    get version () {
        return this.V_;
    }
    get versionBits () {
        return 2;
    }

    set packetCounterFlag (c) {
        this.C_ = c;
    }
    get packetCounterFlag () {
        return this.C_;
    }
    get packetCounterFlagBits () {
        return 1;
    }
    isPacketCounter () {
        return this.C_;
    }
    
    /**
     * 00 - without AL-FEC
     * 01 - with AL-FEC
     * 10 - repair symbol(s)
     * 11 - reserved
     */
    set fecType (fec) {
        this.FEC_ = fec;
    }
    get fecType () {
        return this.FEC_;
    }
    get fecTypeBits () {
        return 2;
    }

    set privateUserDataFlag (p) {
        this.P_ = p;
    }
    get privateUserDataFlag () {
        return this.P_;
    }
    get privateUserDataFlagBits () {
        return 1;
    }
    isPrivateUserData () {
        return this.P_;
    }

    set extensionFlag (e) {
        this.E_ = e;
    }
    get extensionFlag () {
        return this.E_;
    }
    get extensionFlagBits () {
        return 1;
    }
    isExtension () {
        return this.E_;
    }

    get reservedBits () {
        return 9;
    }

    set packetID (id) {
        this.packet_id_ = id;
    }
    get packetID () {
        return this.packet_id_;
    }
    get packetIDBytes () {
        return 2;
    }

    set packetSequenceNumber (packet_sequence_number) {
        this.packet_sequence_number_ = packet_sequence_number;
    }
    get packetSequenceNumber () {
        return this.packet_sequence_number_;
    }
    get packetSequenceNumberBytes () {
        return 4;
    }

    set timestamp (ts) {
        this.timestamp_ = ts;
    }
    get timestamp () {
        return this.timestamp_;
    }
    get timestampBytes () {
        return 4;
    }

    set packetCounter (packet_counter) {
        this.packet_counter_ = packet_counter;
    }
    get packetCounter () {
        return this.packet_counter_;
    }
    get packetCounterBytes () {
        return 4;
    }

    set private_user_data (data) {
        this.private_user_data_ = data;
    }
    get private_user_data () {
        return this.private_user_data_;
    }
    get private_user_dataBytes () {
        return 2;
    }

    set payload_data (data) {
        this.payload_data_ = data;
    }
    get payload_data () {
        return this.payload_data_;
    }

    set source_FEC_payload_ID (id) {
        this.source_FEC_payload_ID_ = id;
    }
    get source_FEC_payload_ID () {
        return this.source_FEC_payload_ID_;
    }
    get source_FEC_payload_ID_Bytes () {
        return 4;
    }

    set extType (type) {
        this.ext_type_ = type;
    }
    get extType () {
        return this.ext_type_;
    }
    get extTypeBytes () {
        return 2;
    }

    set extLength (len) {
        this.ext_length_ = len;
    }
    get extLength () {
        return this.ext_length_;
    }
    get extLengthBytes () {
        return 2;
    }

    set ext_header_extension_value (value) {
        this.ext_header_extension_value_ = value;
    }
    get ext_header_extension_value () {
        return this.ext_header_extension_value_;
    }
    get ext_header_extension_valueBytes () {
        return 4;
    }
}
module.exports = mmtpPacket;
},{}],23:[function(require,module,exports){
(function (Buffer){
var MPUFragment = require("./../mpu-manager/mmt-structure/mpu-fragment");
var FragmentedMPUHeader = require('./fragmented-mpu-header');
var MMTPayloadHeader = require('./mmt-payload-header');
var MPU_Fragment_Type = require("./../mpu-manager/mmt-structure/mpu-fragment-type");
var TimedMediaMFUHeader = require("./timed-media_MFU");
var NonTimedMediaMFUHeader = require("./non-timed_media_MFU");

class depayloadizer {
    constructor () {
        
    }

    depayloadize (payloadBuf) {
        let iterator = 0;
        let mpuFrag = new MPUFragment();

        let payload = this.decomposePayload(payloadBuf);
        
        let i = 0;
        let j = 0;
        let duLens = payload.data.DataUnitLengths;
        let dus = payload.data.DataUnitDatas;
        let duCnt = duLens.length;
        let totalDuSize = 0;
        for (i=0; i<duCnt; i++) {
            totalDuSize += duLens[i];
        }

        let duSet = Buffer.allocUnsafe(totalDuSize).fill(0x00);
        for (i=0; i<duCnt; i++) {
            if (dus[i] !== undefined) { // 왜 계속 17바이트???
                dus[i].copy(duSet, j, 0, duLens[i]);
            }
            j += duLens[i];
        }

        let fragmentMPUHeader = this.decomposeFragmentMPUHeader(duSet, iterator);
        mpuFrag.type = fragmentMPUHeader.fragmentType;
        iterator += fragmentMPUHeader.length;
        let timed = fragmentMPUHeader.isTimed();
        
        if (fragmentMPUHeader.fragmentType === MPU_Fragment_Type.MFU) {
            let mfuHeader = this.decomposeMFUHeader(payloadBuf, iterator, timed);
            if (timed === true) {
                mpuFrag.movie_fragment_sequence_number = mfuHeader.movie_fragment_sequence_number;
                mpuFrag.sample_number = mfuHeader.sample_number;
                mpuFrag.offset = mfuHeader.offset;
                mpuFrag.priority = mfuHeader.priority;
                mpuFrag.dep_counter = mfuHeader.dep_counter;
                iterator += mfuHeader.size;
            }
            else {
                mpuFrag.item_ID = mfuHeader.nonTimedMediaItemID;
                iterator += mfuHeader.size;
            }
        }

        mpuFrag.size = totalDuSize - iterator;
        mpuFrag.data = Buffer.allocUnsafe(mpuFrag.size).fill(0x00);
        duSet.copy(mpuFrag.data, 0, iterator, totalDuSize);

        return mpuFrag;
    }

    decomposeFragmentMPUHeader (fragment, beginPoint) {
        let fragmentMPUHeader = new FragmentedMPUHeader ();
        let fragmentMPUHeaderBuf = fragment.readUIntBE(beginPoint, fragmentMPUHeader.length);
        fragmentMPUHeader.fragmentType = fragmentMPUHeaderBuf >> 1;
        if (fragmentMPUHeaderBuf | 0x01) {
            fragmentMPUHeader.setTimed();
        }
        else {
            fragmentMPUHeader.setNonTimed();
        }
        return fragmentMPUHeader;
    }

    decomposeMFUHeader (fragment, beginPoint, timed) {
        let buf = null;
        let iterator = beginPoint;
        let mfuHeader = null;

        if (timed === false) { // Non-timed media
            mfuHeader = new NonTimedMediaMFUHeader();
            mfuHeader.nonTimedMediaItemID = fragment.readUInt32BE(iterator);
            iterator += 4;
        }
        else {
            mfuHeader = new TimedMediaMFUHeader();

            mfuHeader.movie_fragment_sequence_number = fragment.readUInt32BE(iterator);
            iterator += 4;

            mfuHeader.sample_number = fragment.readUInt32BE(iterator);
            iterator += 4;

            mfuHeader.offset = fragment.readUInt16BE(iterator);
            iterator += 2;

            mfuHeader.priority = fragment.readUIntBE(iterator, 1);
            iterator += 1;

            mfuHeader.dep_counter = fragment.readUIntBE(iterator, 1);
            iterator += 1;
        }

        return {data: mfuHeader, size: iterator - beginPoint};
    }

    decomposePayload (payloadData) {
        let payload = new MMTPayloadHeader();
        let iterator = 0;
        let buf = null;

        payload.type = payloadData.readUIntBE(iterator, 1);
        iterator += 1;

        buf = payloadData.readUIntBE(iterator, 1);
        iterator += 1;

        payload.fragmentationIndicator = (buf & 0xC0) >> 6;
        payload.aggregationFlag = (buf & 0x20) >> 5;
        payload.randomAccessPointFlag = (buf & 0x10) >> 4;
        payload.mpuSequenceNumberFlag = (buf & 0x08) >> 3;
        payload.S = (buf & 0x07);

        if (payload.mpuSequenceNumberFlag) {
            payload.mpuSequenceNumber = payloadData.readUInt32BE(iterator);
            iterator += 4;
        }

        payload.fragmentCounter = payloadData.readUIntBE(iterator, 1);
        iterator += 1;

        while (iterator < payloadData.length) {
            let duLen = payloadData.readUInt16BE(iterator); // 첫번째 len은 1233이 맞다 payload header 7byte + len이 써지는 2byte 해서 1242가 되어야 하는데 1248이 되고 있다.
            iterator += 2;
            let du = Buffer.allocUnsafe(duLen).fill(0x00);
            payloadData.copy(du, 0, iterator, iterator + duLen);
            payload.setDataUnit(du, duLen);
            iterator += duLen;
        }

        return {data: payload, size: iterator};
    }
}
module.exports = depayloadizer;
}).call(this,require("buffer").Buffer)
},{"./../mpu-manager/mmt-structure/mpu-fragment":11,"./../mpu-manager/mmt-structure/mpu-fragment-type":10,"./fragmented-mpu-header":24,"./mmt-payload-header":25,"./non-timed_media_MFU":26,"./timed-media_MFU":27,"buffer":35}],24:[function(require,module,exports){
(function (Buffer){
class FragmentedMPUHeader {
    constructor (FT, T) {
        this.FT_ = FT;  // 7bits, fragment type
        this.T_ = T;    // 1bit, timed or non-timed
    }

    
    make () {
        let header = null;
        let headerIter = 0;

        let fragmentedMPUHeader = Buffer.allocUnsafe(1).fill(0x00);
        fragmentedMPUHeader.writeUInt8((this.FT_ << 1) | this.T_);
        return fragmentedMPUHeader;
    }

    get length () {
        return 1; // 1 byte
    }

    set fragmentType (ft) {
        this.FT_ = ft;
    }
    get fragmentType () {
        return this.FT_;
    }

    setTimed () {
        this.T_ = 0x00;
    }
    setNonTimed () {
        this.T_ = 0x01;
    }
    isTimed () {
        if (this.T_ === 0x00) {
            return true;
        }
        else if (this.T_ === 0x01) {
            return false;
        }
    }
    get Timed () {
        return this.T_;
    }
}
module.exports = FragmentedMPUHeader;
}).call(this,require("buffer").Buffer)
},{"buffer":35}],25:[function(require,module,exports){
class mmtPayloadHeader {
    constructor(length,                 // 16bits, Length of payload excluding header
                type,                   // 8bits, Payload data type
                f_i,                    // 2bits, Fragment indicator
                A,                      // 1bit, Aggregated(1) or not, Aggregate: multi data unit in a payload
                R,                      // 1bit, Contain sync sample(1) or not for Random access point
                M,                      // 1bit, mpu_sequence_number field present(1) or not
                S,                      // 3bits, reserved
                MPU_sequence_number,    // 32bits, Sequence number of the MPU
                frag_count,             // 8bits, Number of payload containing fragments
                DU_length,              // 16bits, data unit length, ref Aggregated
                DU_data                 // DU_length bits, data unit header and payload(timed media, non-timed media, )
                ) 
    {
        this.packet = null;
        this.length_ = length;
        this.type_ = type;
        this.f_i_ = f_i;
        this.A_ = A;
        this.R_ = R;
        this.M_ = M;
        this.S_ = 0x00;
        this.MPU_sequence_number_ = MPU_sequence_number;
        this.frag_count_ = frag_count;
        this.DU_length_ = [];
        this.DU_data_ = [];

        if (DU_length !== undefined && DU_data !== undefined) {
            this.DU_length_.push(DU_length);
            this.DU_data_.push(DU_data);
        }
    }

    /*
    make () {
        let payload = null;
        let payloadIter = 0;
        let typeBuffer = Buffer.allocUnsafe(1).fill(this.type_);
        let flagsBuffer = Buffer.allocUnsafe(1).fill(((0x00 | this.f_i_) << 6) | 
                                                     ((0x00 | this.A_)   << 4) | 
                                                     ((0x00 | this.R_)   << 3) |
                                                     ((0x00 | this.M_)   << 3) |
                                                      (0x00 | this.S_)           );
        let seqNumBuffer = Buffer.allocUnsafe(4).fill(this.MPU_sequence_number_);
        let fragCntBuffer = Buffer.allocUnsafe(1).fill(0x00 | this.frag_count_);
        let DUBuffer = null;
        let DUBufferLen = 0;
        
        if (this.A_ === 0 || this.DU_length_.length == 1) {
            this.A_ = 0;

            let DULenBuffer = Buffer.allocUnsafe(2).fill(0x00 | this.DU_length_[0]);
            let DUHeaderLen = 0; // by this.DUHeader type
            let DUHeaderBuffer = Buffer.allocUnsafe(DUHeaderLen).fill(0x00 | this.DU_Header_[0]);
            let DUPayloadBuffer = Buffer.allocUnsafe(this.DU_length_[0]).fill(0x00 | this.DU_Payload_[0]);
            
            DUBufferLen = 2 + DUHeaderLen + this.DU_length_[0];
            DUBuffer = Buffer.allocUnsafe(DUBufferLen).fill(0x00);
            DULenBuffer.copy(DUBuffer, 0, 0, 2);
            DUHeaderBuffer.copy(DUBuffer, 2, 0, 0);
            DUPayloadBuffer.copy(DUBuffer, 2 + DUHeaderLen, 0, this.DU_length_[0]);
        }
        else {
            let DUCnt = this.DU_length_.length;
            let DUBufferIter = 0;
            let i = 0;
            for (i=0; i<DUCnt; i++) {
                let DUHeaderLen = 0; // by this.DUHeader type
                DUBufferLen += 2;
                DUBufferLen += DUHeaderLen;
                DUBufferLen += this.DU_length_[i];
            }

            DUBuffer = Buffer.allocUnsafe(DUBufferLen).fill(0x00);
            for (i=0; i<DUCnt; i++) {
                let DULenBuffer = Buffer.allocUnsafe(2).fill(0x00 | this.DU_length_[0]);
                let DUHeaderLen = 0; // by this.DUHeader type
                let DUHeaderBuffer = Buffer.allocUnsafe(DUHeaderLen).fill(0x00 | this.DU_Header_[0]);
                let DUPayloadBuffer = Buffer.allocUnsafe(this.DU_length_[0]).fill(0x00 | this.DU_Payload_[0]);
                
                DULenBuffer.copy(DUBuffer, DUBufferIter, 0, 2);
                DUBufferIter += 2;
                DUHeaderBuffer.copy(DUBuffer, DUBufferIter, 0, DUHeaderLen);
                DUBufferIter += DUHeaderLen;
                DUPayloadBuffer.copy(DUBuffer, DUBufferIter, 0, this.DU_length_[i]);
                DUBufferIter += this.DU_length_[i];
            }
        }

        payload = Buffer.allocUnsafe(1 + 1 + 4 + 1 + DUBufferLen).fill(0x00);
        typeBuffer.copy(payload, payloadIter, 0, 1);
        payloadIter += 1;
        flagsBuffer.copy(payload, payloadIter, 0, 1);
        payloadIter += 1;
        seqNumBuffer.copy(payload, payloadIter, 0, 4);
        payloadIter += 4;
        fragCntBuffer.copy(payload, payloadIter, 0, 1);
        payloadIter += 1;
        DUBuffer.copy(payload, payloadIter, 0, DUBufferLen);
        payloadIter += DUBufferLen;

        return {data: payload, len:payloadIter};
    }

    set length (len) {
        this.length_ = len;
    }
    get length () {
        return this.length_;
    }*/
    
    /**
    * 0x00 - MPU 
    * 0x01 - MPU Fragment
    * 0x02 - signaling message
    * 0x03 - repair simbol
    * 0x04 - Generic Object
    * ~0xFF - reserved
    */
    set type (typ) {
        this.type_ = typ;
    }
    get type () {
        return this.type_;
    }
    get typeBytes () {
        return 1;
    }

    /**
     * 00 - number of data units >= 1
    * 01 - first fragment of data unit
    * 10 - fragment of data unit that is neither the first nor the last part
    * 11 - last fragment of data unit
    */
    set fragmentationIndicator (fi) {
        this.f_i_ = fi;
    }
    get fragmentationIndicator () {
        return this.f_i_;
    }
    get fragmentationIndicatorBits () {
        return 2;
    }

    /**
     * 1 - aggrated this packet
    */
    set aggregationFlag (a) {
        this.A_ = a;
    }
    get aggregationFlag () {
        return this.A_;
    }
    get aggregationFlagBits () {
        return 1;
    }
    isAggretated () {
    return this.A_;
    }

    /**
     * 1 - contain sync sample
    */
    set randomAccessPointFlag (rapFlag) {
        this.R_ = rapFlag;
    }
    get randomAccessPointFlag () {
        return this.R_;
    }
    get randomAccessPointFlagBits () {
        return 1;
    }
    isRandomAccessPoint () {
        return this.R_;
    }

    set mpuSequenceNumberFlag (m) {
        this.M_ = m;
    }
    get mpuSequenceNumberFlag () {
        return this.M_;
    }
    get mpuSequenceNumberFlagBits () {
        return 1;
    }
    isMpuSequenceNumberFlag () {
        return this.M_;
    }

    set S (s) {
        this.S_ = s;
    }
    get S () {
        return this.S_;
    }
    get S_Bits () {
        return 3;
    }

    set fragmentCounter (frag_count) {
        this.frag_count_ = frag_count;
    }
    get fragmentCounter () {
        return this.frag_count_;
    }
    get fragmentCounterBytes () {
        return 1;
    }

    set mpuSequenceNumber (mpu_sequence_number) {
        this.MPU_sequence_number_ = mpu_sequence_number;
    }
    get mpuSequenceNumber () {
        return this.MPU_sequence_number_;
    }
    get mpuSequenceNumberBytes () {
        if (this.M_) {
            return 4;
        }
        else {
            return 0;
        }
    }

    setDataUnit (du, length) {
        if (du !== null && length !== null)
        {
            this.DU_length_.push(length);
            this.DU_data_.push(du);
        }
    }
    getDataUnit (n) {
        if (n !== undefined && this.DU_length_.length < n) {
            return {lengths: this.DU_length_[n], datas: this.DU_data_[n]};
        }
        else {
            return null;
        }
    }

    get DataUnitLengths () {
        return this.DU_length_;
    }

    get DataUnitDatas () {
        return this.DU_data_;
    }

}
module.exports = mmtPayloadHeader;
},{}],26:[function(require,module,exports){
(function (Buffer){
class NonTimedMediaMFUHeader {
    constructor (item_ID) {
        this.item_ID_ = item_ID;
        this.size_ = 32;
    }

    make() {
        let buf = Buffer.allocUnsafe(this.size_).fill(0x00);
        buf.writeUIntBE(this.item_ID_, 0, this.size_);
        return buf;
    }

    get totalSize () {
        return this.size_;
    }

    set item_ID (id) {
        this.item_ID_ = id;
    }
    get item_ID () {
        return this.item_ID_;
    }
}
module.exports = NonTimedMediaMFUHeader;
}).call(this,require("buffer").Buffer)
},{"buffer":35}],27:[function(require,module,exports){
(function (Buffer){
class TimedMediaMFUHeader {
    constructor (movie_fragment_sequence_number,
                 sample_number,
                 offset,
                 priority,
                 dep_counter) {
        this.movie_fragment_sequence_number_ = movie_fragment_sequence_number;
        this.sample_number_ = sample_number;
        this.offset_ = offset;
        this.priority_ = priority;
        this.dep_counter_ = dep_counter;
        this.size_ = 12;
    }

    make () {
        let mfuHeader = Buffer.allocUnsafe(this.size_).fill(0x00);
        
        mfuHeader.writeUIntBE(this.movie_fragment_sequence_number_, 0, 4);
        mfuHeader.writeUIntBE(this.sample_number_, 4, 4);
        mfuHeader.writeUIntBE(this.offset_, 8, 2);
        mfuHeader.writeUIntBE(this.priority_, 10, 2);
        
        return mfuHeader;
    }

    get totalSize () {
        return this.size_;
    }

    set movie_fragment_sequence_number (seqNum) {
        this.movie_fragment_sequence_number_ = seqNum;
    }
    get movie_fragment_sequence_number () {
        return this.movie_fragment_sequence_number_;
    }

    set sample_number (num) {
        this.sample_number_ = num;
    }
    get sample_number () {
        return this.sample_number_;
    }

    set offset (o) {
        this.offset_ = o;
    }
    get offset () {
        return this.offset_;
    }

    set priority (p) {
        this.priority_ = p;
    }
    get priority () {
        return this.priority_;
    }

    set dep_counter (cnt) {
        this.dep_counter_ = cnt;
    }
    get dep_counter () {
        return this.dep_counter_;
    }
}
module.exports = TimedMediaMFUHeader;
}).call(this,require("buffer").Buffer)
},{"buffer":35}],28:[function(require,module,exports){
var BrowserCode = require("../Client/src/browser-code.js");
var that = null;

class TcpController {
    constructor () {
        this.onRecv = null;
        this.onEnd = null;
        this.onError = null;
        this.onTimeout = null;
        this.onConnected = null;

        this.tcpSock = null;
        this.tcpSockType = null;

        that = this;
    }

    createServer (port) {
        let Net = require("net");
        let server = Net.createServer((connect) => {
            if (that.onConnected) {
                that.tcpSock = connect;
                connect.on("message", function (msg) {
                    if (that.onRecv) {
                        that.onRecv(msg);
                    }
                })
                connect.on("close", function () {
                    if (that.onEnd) {
                        that.onEnd();
                    }
                })
                that.onConnected (connect); //node.js net 서버와 WebSocket 클라이언트 사이에 connect가 되지 않는다. 서버에서 클라이언트의 accept를 위한 어떠한 데이터를 보내줘야 하는것 같다.
            }
        });
       
        server.on("data", function (chunk) {
            //console.log(chunk);
            if (that.onRecv) {
                that.onRecv(chunk);
            }
        });

        server.on('error', (err) => {
            console.log(err);
            if (that.onError) {
                that.onError();
            }
        });

        server.on('listenning', (data) => {
            console.log('listenning: ' + data);
        });

        server.listen(port, () => {
            console.log('server bound');
        });
    }

    createNodeClient (host, port) {
        let Net = require("net");
        this.tcpSock = Net.connect({host: host, port : port});
        this.tcpSock.on("connect", function () {
            console.log("TCP connect!");
            if (that.onConnected) {
                that.onConnected ();
            }
        });

        this.tcpSock.on("data", function (chunk) {
            //console.log(chunk);
            if (that.onRecv) {
                that.onRecv(chunk);
            }
        });

        this.tcpSock.on("end", function () {
            console.log("disconnected.");
            if (that.onEnd) {
                that.onEnd();
            }
        });

        this.tcpSock.on("error", function (err) {
            console.log(err);
            if (this.onError) {
                this.onError();
            }
        });

        this.tcpSock.on("timeout", function () {
            console.log("connection timeout");
            if (that.onTimeout) {
                that.onTimeout();
            }
        });
    }

    createChromeClient (host, port) {
        let WebSocketClient = require("websocket").w3cwebsocket;

        this.tcpSock = new WebSocketClient("ws://"+"localhost"+":"+port+"/");
        if (that.onError) {
            that.tcpSock.onerror = function (e) {
                that.onError(e);
            }
        }
        if (that.onConnected) {
            that.tcpSock.onopen = function (e) {
                that.onConnected();
            }
        }
        if (that.onEnd) {
            that.tcpSock.onclose = function (e) {
                that.onEnd();
            }
        }
        if (that.onRecv) {
            that.tcpSock.onmessage = function(msg) {
                that.onRecv(msg.data);
            };
        }
    }
    
    /**
     * Create and connect to server by tcp socket
     * @param server ip address
     * @param server port number
     */
    createClient (host, port, usingBrowserCode) {
        let browser = new BrowserCode();
        if (usingBrowserCode == browser.node) {
            this.tcpSockType = "node";
            this.createNodeClient(host, port);
        }
        else if (usingBrowserCode == browser.chrome) {
            this.tcpSockType = "websocket";
            this.createChromeClient(host, port);
        }
        
    }

    set onRecvCB (func) {
        this.onRecv = func;
    }

    set onEndCB (func) {
        this.onEnd = func;
    }

    set onErrorCB (func) {
        this.onError = func;
    }

    set onTimeoutCB (func) {
        this.onTimeout = func;
    }

    set onConnectedCB (func) {
        this.onConnected = func;
    }

    send (buf) {
        if (that.tcpSockType === "node") {
            that.tcpSock.write(buf);
        }
        else if (that.tcpSockType === "websocket") {
            that.tcpSock.send(buf);
        }
    }
}

module.exports = TcpController;
},{"../Client/src/browser-code.js":4,"net":33,"websocket":17}],29:[function(require,module,exports){
var BrowserCode = require("../Client/src/browser-code.js");
var that = null;

class WebRtcSet {
    constructor () {
        this.sendChannel = null;
        this.recvConnection = null;
        this.recvChannel = null;
    }
}
 
class UDPController {
    constructor (socketType) {
        this.useWebRTC = false;

        if (socketType === "node") {
            this.dgram = require("dgram");
        }
        else if (socketType === "webrtc") {
            this.useWebRTC = true;
            //var RTCPeerConnection = require("rtc");
            this.webRTCServer = false;
            this.webRTCClient = false;
            console.log("Use Web-RTC");
        }
        else {
            return null;
        }
        
        this.udpSock = null;
        this.onError = null;
        this.onRecv = null;
        this.onListen = null;

        this.addr_ = null;
        this.port_ = null;

        this.recvPktCnt = 0;

        this.webRtcCandidateListener_ = null;
        this.remoteWebRtcCandidate_ = null;

        that = this;
    }

    createUDPSock () {
        if (this.useWebRTC === false) { //dgram
            this.createNodeDgramSock();
        }
        else { // WebRTC
            this.createWebRtcSock();
        }
    }

    set webRtcCandidateListener (func) {
        this.webRtcCandidateListener_ = func;
    }

    set remoteWebRtcCandidate (candidate) {
        this.remoteWebRtcCandidate_ = candidate;
    }

    createWebRtcSock () {
        const config = {
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };

        if (this.useWebRTC === false) {
            return null;
        }

        this.udpSock = new WebRtcSet();
        
        if (this.webRTCServer === true) {
            let wrtc = require("wrtc");
            let RTCPeerConnection = wrtc.RTCPeerConnection;
            
            this.udpSock.sendConnection = new RTCPeerConnection(config);
            if (this.udpSock.sendConnection == null) {
                return null;
            }

            this.udpSock.sendConnection.onicecandidate = ({ candidate }) => {
                if (candidate && that.webRtcCandidateListener_) {
                    that.webRtcCandidateListener_(candidate);
                }
            };
        }
        else if (this.webRTCClient === true) {
            this.udpSock.recvConnection = new RTCPeerConnection(config);
            if (this.udpSock.recvConnection == null) {
                return null;
            }

            this.udpSock.recvConnection.onicecandidate = ({ candidate }) => {
                if (candidate && that.webRtcCandidateListener_) {
                    that.webRtcCandidateListener_(candidate);
                }
            };
        }
    }

    readyWebRtcSock (channelName, candidate) {
        if (this.useWebRTC === false) {
            return null;
        }
        
        if (this.webRTCServer === true) {
            const dataChannelConfig = { ordered: false, maxRetransmits: 0 };
            const channelLabel = "mmt-stream-channel";// + channelName; //mmt-stream-channel-server-xxxxx
            
            this.udpSock.sendChannel = this.udpSock.sendConnection.createDataChannel(channelLabel, dataChannelConfig);

            //this.udpSock.sendChannel.onmessage = this.handleSendMessage;
            this.udpSock.sendChannel.onopen = this.handleSendChannelStatusChange;
            this.udpSock.sendChannel.onclose = this.handleSendChannelStatusChange;

            //let remoteConnection = new RTCPeerConnection();
            //remoteConnection.ondatachannel = this.receiveChannelCallback;

            //this.udpSock.sendConnection.onicecandidate = e => !e.candidate
            /*|| remoteConnection.addIceCandidate(e.candidate)
            .catch(this.handleAddCandidateError);*/

            /*this.udpSock.sendConnection.createOffer()
                .then(offer => this.udpSock.sendConnection.setLocalDescription(offer))
                .then(() => remoteConnection.setRemoteDescription(this.udpSock.sendConnection.localDescription))
                .then(() => remoteConnection.createAnswer())
                .then(answer => remoteConnection.setLocalDescription(answer))
                .then(() => this.udpSock.sendConnection.setRemoteDescription(remoteConnection.localDescription)) //RemoteConnection!!! client로부터 받아야 하나?
                .catch(this.handleCreateDescriptionError);*/
        }
        else if (this.webRTCClient === true) {
            const dataChannelConfig = { ordered: false, maxRetransmits: 0 };
            const channelLabel = "mmt-stream-channel";// + channelName; //mmt-stream-channel-client-xxxxx
            
            this.udpSock.recvChannel = this.udpSock.recvConnection.createDataChannel(channelLabel, dataChannelConfig);
            this.udpSock.recvConnection.ondatachannel = this.receiveChannelCallback;
            
            this.udpSock.recvChannel.onmessage = this.handleReceiveMessage;
            this.udpSock.recvChannel.onopen = this.handleReceiveChannelStatusChange;
            this.udpSock.recvChannel.onclose = this.handleReceiveChannelStatusChange;

            /*const sdpConstraints = {
                mandatory: {
                    OfferToReceiveAudio: false,
                    OfferToReceiveVideo: false,
                },
            };
            
            this.udpSock.recvConnection.onicecandidate = this.onIceCandidate;
            this.udpSock.recvConnection.createOffer(this.onOfferCreated, () => {}, sdpConstraints);*/
        }
    }

    handleCreateDescriptionError (event) {
        console.log(event);
    }

    handleAddCandidateError (event) {
        console.log(evnet);
    }
    
    receiveChannelCallback (event) {
        that.recvPktCnt ++;
        console.log("Recv:" + that.recvPktCnt);
        
        that.udpSock.recvChannel = event.channel;
        that.udpSock.recvChannel.onmessage = that.handleReceiveMessage;
        that.udpSock.recvChannel.onopen = that.handleReceiveChannelStatusChange;
        that.udpSock.recvChannel.onclose = that.handleReceiveChannelStatusChange;
    }

    onIceCandidate (event) {
        console.log("onIceCandidate - " + event.candidate);
        /*if (event && event.candidate) {
            webSocketConnection.send(JSON.stringify({type: 'candidate', payload: event.candidate}));
        }*/
    }

    onOfferCreated(description) {
        console.log("onOfferCreated - SDP - " + description.sdp);
        console.log("onOfferCreated - type - " + description.type);
        that.udpSock.recvConnection.setLocalDescription(description);
        //webSocketConnection.send(JSON.stringify({type: 'offer', payload: description}));
    }

    set MediaStreamType (type) {
        if (this.useWebRTC == true) {
            if (type == "sender") {
                this.webRTCServer = true;
                this.webRTCClient = false;
            }
            else if (type === "receiver") {
                this.webRTCServer = false;
                this.webRTCClient = true;
            }
        }
    }

    handleSendChannelStatusChange (event) {
        if (that.udpSock.sendChannel) {
            let state = that.udpSock.sendChannel.readyState;
        
            if (state === "open") {
                /** example
                messageInputBox.disabled = false;
                messageInputBox.focus();
                sendButton.disabled = false;
                disconnectButton.disabled = false;
                connectButton.disabled = true;
                */
               
            } 
            else {
                /** example
                messageInputBox.disabled = true;
                sendButton.disabled = true;
                connectButton.disabled = false;
                disconnectButton.disabled = true;
                */
            }
        }
    }

    handleReceiveMessage(event) {
        /* example
        let el = document.createElement("p");
        let txtNode = document.createTextNode(event.data);
        
        el.appendChild(txtNode);
        receiveBox.appendChild(el);
        */

        console.log("Got from server: "+ event.data);
        if (that.onRecv !== null) {
            that.onRecv(event.data, null);
        }
    }

    handleReceiveChannelStatusChange (event) {
        console.log("Receive channel's status has changed to ");// + receiveChannel.readyState);
        if (that.udpSock.recvChannel.readyState == "open") {
            
        }
        else {
            
        }
    }

    getConnectInfo() {
        return this.connectInfo;
    }
    
    createNodeDgramSock () {
        if (this.dgram == undefined || this.dgram == null) {
            return null;
        }

        this.udpSock = this.dgram.createSocket({type:"udp6", recvBufferSize:1024*1024*5, sendBufferSize:1024*1024*5});
        
        this.udpSock.on("error", (err) => {
            if (err !== null) {
                console.log("server error:\n${err.stack}");
                console.log(err);
                if (this.onError !== null) {
                    this.onError(err);
                }
                this.udpSock.close();
            }
        });

        this.udpSock.on("message", (msg, rinfo) => {
            //console.log("server got: "+msg+" from "+rinfo.address+":"+rinfo.port);
            if (this.onRecv !== null) {
                this.onRecv(msg, rinfo);
            }
        });

        this.udpSock.on("listening", () => {
            let address = this.udpSock.address();
            this.addr_ = address.address;
            this.port_ = address.port;
            console.log("udp listening "+address.address+" "+address.port);
        });

        //this.udpSock.setRecvBufferSize(1024*1024);
    }

    setRecvBufferSize (size) {
        this.udpSock.setRecvBufferSize(size);
    }

    bind (ipAddr, port, cbFunc) {
        if (this.useWebRTC !== true) {
            if (port === null || port === undefined) {
                port = this.port_;
            }
            if (ipAddr === null || ipAddr === undefined) {
                ipAddr = this.addr_;
            }
            console.log("udp controller - bind - port: "+port+", addr: "+ipAddr);
            this.udpSock.bind(port, ipAddr, cbFunc);
        }
        else {
            this.readyWebRtcSock("test");        
        }
    }

    sendUDPSock (data, port, ipAddr) {
        if (port === null || port === undefined || ipAddr === null || ipAddr === undefined || data === undefined) {
            return false;
        }
        if (this.useWebRTC == true) {
            if (this.udpSock === null) {
                if (this.createWebRtcSock("" + port + ipAddr) === null) {
                    return false;
                }
            }
            this.udpSock.sendChannel.send(data);
        }
        else {
            //console.log("udp controller - send - port: "+port+", addr: "+ipAddr+", data:");
            this.udpSock.send(data, port, ipAddr, (err) => {
                if (err !== null) {
                    console.log("sendUDPSock - "+err);
                    if (this.onError !== null) {
                        this.onError();
                    }
                    this.udpSock.close();
                }
            });
        }
    }

    set onListenCB (func) {
        console.log("Set onListenCB");
        this.onListen = func;
    }

    set onRecvCB (func) {
        this.onRecv = func;
    }

    set onErrorCB (func) {
        this.onError = func;
    }

    get address () {
        return this.addr_;
    }

    get port () {
        return this.port_;
    }
}

module.exports = UDPController;

//var udpController = new UDPController(new BrowserCode().chrome);
},{"../Client/src/browser-code.js":4,"dgram":33,"wrtc":20}],30:[function(require,module,exports){
class Item {
    constructor (data, seq) {
        this._data = data;
        this._seq = seq;
    }
    set data (data) {
        this._data = data;
    }
    get data () {
        return this._data;
    }
    set seq (seq) {
        this._seq = seq;
    }
    get seq () {
        return this._seq;
    }
}
exports.Item = Item;

/*
var itemTest = function () {
    let item = new Item("a1", 1);
    console.log(item);
    item.seq=2;
    item.data="a2";
    console.log(item);
};

itemTest();
*/

class SortedList {
    constructor () {
        this._list = []; 
    }

    get length () {
        return this._list.length;
    }

    putItem (item) {
        let i = 0;
        let len = this._list.length;

    //    console.log("putItem - 0 - " + item.seq);

        if (len > 0){
            for (i=0; i<len; i++) {
                if (item.seq <= this._list[i].seq) {
                    break;
                }
            }

            if (i === len) {
                if (this._list.push(item) === len+1) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                this._list.splice(i, 0, item);
                return true;
            }
        }
        else {
            if (this._list.push(item) === len + 1) {
                return true;
            }
            else {
                return false;
            }
        }

        /*let str = "";
        len = this._list.length;
        for (i=0; i<len; i++) {
            str += this._list[i].seq + "-";
        }
        console.log("SortedList - putItem: " + str);*/
    }
    pullItem (num) {
        if (num === undefined) {
            if (this._list.length > 0) {
                let item = this._list[0];
            //  console.log("sortedList-pullItem: " + item.seq);
                return item;
            }
            else {
                return null;
            }
        }
        else if(typeof num === "number") {
            return this._list[num];
        }
        else {
            return null;
        }
    }
    removeItem (item) {
        let i = 0;
        let len = this._list.length;
        let ret = false;
        
        for (i=0; i<len; i++) {
            if (item.seq === this._list[i].seq && item.data === this._list[i].data) {
                this._list.splice(0, 1);
                ret = true;
                break;
            }
        }
        return ret;
    }
    get length () {
        return this._list.length;
    }
}
exports.SortedList =  SortedList;

/*
var seed = 1;
var getRndInteger = function (min, max) {
    var x = Math.sin(seed++);
    var ret = Math.floor(x * (max-min) + min);
    if (ret < 0) {
        ret *= -1;
    }
    return ret;
};
*/

/*
var sortedListTest = function () {
    let i = 0;
    let len = 10;
    let item = null;
    let randNum = 0;
    let sortedList = new SortedList();
    

    for (i=0; i<len; i++) {
        item = new Item();
        randNum = getRndInteger(0, len);
        item.seq = randNum;
        item.data = "A" + randNum;
        console.log(item.seq + ", " + item.data);
        sortedList.putItem(item);
    }
    for (i=0; i<len; i++) {
        item = sortedList.pullItem(i);
        console.log(item.seq + ", " + item.data);
    }
    for (i=0; i<1000; i++) {
        item = sortedList.pullItem();
        if (item === null) {
            console.log("Fail - item seq: " + item.seq);
            break;
        }
        if (!sortedList.removeItem(item)) {
            console.log("Remove fail");
        }
        console.log("pulled item seq: "+item.seq);
    }
};

sortedListTest();
*/

class SequentialList {
    constructor () {
        this._seqList = [];
        this._sortedList = new SortedList();
        this._lastItem = null;
    }

    get length() {
        return this._seqList.length + this._sortedList.length;
    }

    checkNextSeqItem () {
        let item = this._seqList[0];
        if (item !== null && item !== undefined) {
            if (this._lastItem === null || (this._lastItem !== null && item.seq === this._lastItem.seq + 1)) {
                return item;
            }
            else {
                console.log("putItem error");
                return null;
            }
        }
        else if (this._seqList.length === 0 && this._sortedList.length > 0){
            // drop this seq num
            let i = 0;
            let lastItem = null;
            let len = this._sortedList.length;
            for(i=0; i<len; i++) {
                item = this._sortedList.pullItem();
                if (lastItem !== null && lastItem.seq + 1 !== item.seq){
                    break;
                }
                this._seqList.push(item);
                lastItem = item;
                this._sortedList.removeItem(item);
            }
            item = this._seqList[0];

            return item;
        }
        else {
            console.log("no item");
            return null;
        }
    }

    getNextSeqItem () {
        let item = this._seqList[0];
        if (item !== null && item !== undefined) {
            if (this._lastItem === null || (this._lastItem !== null && item.seq === this._lastItem.seq + 1)) {
                this._lastItem = item;
                this._seqList.splice(0, 1);
                return item;
            }
            else {
                console.log("putItem error");
                return null;
            }
        }
        else if (this._seqList.length === 0 && this._sortedList.length > 0){
            // drop this seq num
            let i = 0;
            let lastItem = null;
            let len = this._sortedList.length;
            for(i=0; i<len; i++) {
                item = this._sortedList.pullItem();
                if (lastItem !== null && lastItem.seq + 1 !== item.seq){
                    break;
                }
                this._seqList.push(item);
                lastItem = item;
                this._sortedList.removeItem(item);
            }
            item = this._seqList[0];
            this._lastItem = item;
            this._seqList.splice(0, 1);

            return item;
        }
        else {
            console.log("no item");
            return null;
        }
    }
    
    putItem (item) {
        let len = this._seqList.length;
        if(len <= 0) {
            this._seqList.push(item);
        } else {
            let lastItem = this._seqList[len - 1];
            if (lastItem.seq + 1 === item.seq) {
                this._seqList.push(item);
                lastItem = item;
            }
            else {
                this._sortedList.putItem(item);
            }

            let pulledItem = null;
            while((pulledItem = this._sortedList.pullItem()) !== null) {
                if (lastItem.seq + 1 === pulledItem.seq) {
                    this._seqList.push(pulledItem);
                    this._sortedList.removeItem(pulledItem);
                    lastItem = pulledItem;
                }
                else {
                    break;
                }
            }
        }

        let i = 0;
        let str = "";
        len = this._seqList.length;
        for (i = 0; i < len; i++) {
            str += this._seqList[i].seq + " - ";
        }
        //console.log("Sequential putItems: " + str);
        str = "";
        len = this._sortedList.length;
        for (i=0; i<len; i++) {
            str += this._sortedList.pullItem(i).seq + " - ";
        }
        //console.log("SortedList putItems: " + str);

        return true;
    }
}
exports.SequentialList = SequentialList;

/*
var sequentialListTest = function () {
    let arr = [];
    let i = 0;
    let len = 100;
    let swap = function (n, m) {
        [arr[n], arr[m]] = [arr[m], arr[n]];
    };

    for(i=0; i<len; i++) {
        let item = new Item("a" + i, i);
        arr.push(item);
    }

    let str = "";
    for (i=0; i<len; i++) {
        str += arr[i].seq + "-";
    }
    console.log("Input Items: " + str);

    for(i=0; i<len/10; i++) {
        let n = getRndInteger(0, len-1);
        let m = getRndInteger(0, len-1);
        swap(n, m);
        console.log("swap: " + n + ", " + m);
    }

    for(i=0; i<len/10; i++) {
        let drop = getRndInteger(0, arr.length-1);
        console.log("drop: " + drop + ", seq: " + arr[drop].seq + ", data: " + arr[drop].data);
        arr.splice(drop, 1);
    }
    
    len = arr.length;

    str = "";
    for (i=0; i<len; i++) {
        str += arr[i].seq + "-";
    }
    console.log("Swaped Items: " + str);
    

    var seqList = new SequentialList();
    for(i = 0; i < len; i++) {
        seqList.putItem(arr[i]);
    }

    for(i = 0; i < len; i++) {
        let item = seqList.getNextSeqItem();
        console.log("getNextSeqItem - seq: " + item._seq + ", data: " + item._data);
    }
};

sequentialListTest();
*/
},{}],31:[function(require,module,exports){
(function (Buffer){
class FileController {
    constructor () {
        this.Fs = require("fs");
    }
    
    /**
     * Return read file of the path by Buffer object
     * @param {* <string> | <Buffer> | <integer>} path
     */
    readBinFile (path) {
        return new Buffer(this.Fs.readFileSync(path));
    }

    /**
     * Write data to file of the path
     * @param {* <string> | <Buffer> | <integer>} path
     * @param {*<string> | <Buffer> | <Uint8Array>} data
     */
    writeBinFile (path, data) {
        this.Fs.open(path, "wx", (err, fd) => {
            if(err) {
                console.log(err.code);
                return false;
            }
        });
        this.Fs.writeFileSync(path, data);
        return true;
    }
}

module.exports = FileController;

/*
let fileController = new FileController;
let data = fileController.readBinFile("/Users/daehee/Git/MMT-WebPlayer/Client/src/stream/resource/000.mp4");
console.log(data);
let ret = fileController.writeBinFile("/Users/daehee/Git/MMT-WebPlayer/Client/src/stream/resource/100.mp4", data);
console.log(ret);
*/
}).call(this,require("buffer").Buffer)
},{"buffer":35,"fs":33}],32:[function(require,module,exports){
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

        console.log("SequentialList length before getPacketById(" + id + "): " + this._seqList.length);
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
        console.log("SequentialList length after getPacketById(" + id + "): " + this._seqList.length);
   
        if (packetSet.length > 0) {
            return packetSet;
        }
        else {
            return null;
        }
    }
}

module.exports = UDPBuffer;
},{"./SequentialList":30}],33:[function(require,module,exports){

},{}],34:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],35:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (value instanceof ArrayBuffer) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (isArrayBufferView(string) || string instanceof ArrayBuffer) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
  return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":34,"ieee754":36}],36:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}]},{},[3]);
