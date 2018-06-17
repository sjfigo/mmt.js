var TcpController = require("../transport/tcp-controller");
var mmtpReceiver = require("./mmtp-receiver");
var FileController = require("../util/file-controller");

var that = null;

class mmtClient {
    constructor () {
        this.client = new TcpController();
        this.client.onRecvCB = this.onCallSetupRecv;
        this.client.onErrorCB = this.onCallSetupError;
        this.client.onEndCB = this.onCallSetupEnd;
        this.client.onTimeoutCB = this.onCallSetupTimeout;
        this.client.onConnectedCB = this.onCallSetupConnected;

        this.serverCallSetupAddr = null;
        this.serverCallSetupPort = 0;

        this.channelList = [];

        this.fileController = new FileController();
        this.fileCnt = 0;

        that = this;

        //this.depacketizer = new 
    }

    callSetupConnect (host, port) {
        this.serverCallSetupAddr = host;
        this.serverCallSetupPort = port;
        this.client.createClient(host, port);
    }

    onCallSetupRecv (buf) {
        console.log(buf);
        
        let port = parseInt(buf.toString());
        let host = that.serverCallSetupAddr;
        console.log("host: "+that.serverCallSetupAddr);
        console.log("port: "+port);
        let receiver = new mmtpReceiver(host, 0, that.client, that.onRecvMPU);
        receiver.ready();
        
        let channel = {
            host: host,
            port: port,
            mediaReceiver: receiver
        };
        that.channelList.push(channel);
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
        that.fileController.writeBinFile("./Client/output/00"+that.fileCnt.toString()+".mp4", mpu.data);
        that.fileCnt++;
    }
}
module.exports = mmtClient;

var client = new mmtClient ();
client.callSetupConnect("::ffff:127.0.0.1", 8124);