var TcpController = require("../transport/tcp-controller");
var mmtpReceiver = require("./mmtp-receiver");
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
        let recveiver = new mmtpReceiver(host, 0, that.client);
        recveiver.ready();
        that.channelList.push({
            host: host,
            port: port,
            mediaReceiver: recveiver
        });
        //that.client.send(Buffer.from("I'm ready."));
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
}
module.exports = mmtClient;

var client = new mmtClient ();
client.callSetupConnect("::ffff:127.0.0.1", 8124);