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