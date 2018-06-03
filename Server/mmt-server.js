var Net = require("net");
var MMTPSender = require("./mmtp-sender");
var ContentManager = require ("./mmt-content-manager");
var TcpController = require("../transport/tcp-controller");
var that = null;

class mmtServer {
    constructor () {
        this.server = new TcpController();
        this.server.onRecvCB = this.onCallSetupRecv;
        this.server.onErrorCB = this.onCallSetupError;
        this.server.onEndCB = this.onCallSetupEnd;
        this.server.onTimeoutCB = this.onCallSetupTimeout;
        this.server.onConnectedCB = this.onCallSetupConnected;

        this.socket = null;
        this.channels = [];
        this.channelNumber = 0;

        this.tcpSenderPort = 8124;
        this.udpSenderPort = 8000;

        that = this;
    }

    createServer () {
        /*this.server = Net.createServer((connect) => {
            this.socket = connect;
            this.socket.on('end', () => {
                console.log('client disconnected');
            });
            console.log("mmt-server - createServer - connect")
            console.log(this.socket);
            this.socket.pause();
            let sender = new MMTPSender(this.channelNumber, this.socket.localAddress, this.udpSenderPort, this.socket, this.greenLight);
            sender.ready();
            sender.beReadyCB = this.beReady;
            console.log("Connected port: " + sender.port);
            this.channels.push({
                channel_number : this.channelNumber,
                sender : sender
            });
            this.channelNumber ++;
        });
        this.server.on("data", function (chunk) {
            console.log(chunk);
            let port = chunk.toInteger();
            if ()
        });
        this.server.on('error', (err) => {
            console.log(err);
        });
        this.server.on('listenning', (data) => {
            console.log('listenning: ' + data);
        });
        this.server.listen(8124, () => {
            console.log('server bound');
        });*/

        this.server.createServer(this.tcpSenderPort);
    }

    /*onCallSetupRecv (chunk) {
        console.log(chunk);
        
        let port = parseInt(chunk.toString());
    }*/

    onCallSetupError (err) {
        console.log('Call setup error:' + err);
    }

    onCallSetupEnd () {
        console.log("mmtServer onEnd");
    }

    onCallSetupTimeout () {
        console.log("mmtServer onTimeout");
    }

    onCallSetupConnected (connect) {
        console.log("mmt-server - createServer - connect")
        let sender = new MMTPSender(that.channelNumber, connect.localAddress, that.udpSenderPort, connect, that.greenLight);
        sender.ready();
        console.log("Connected port: " + sender.port);
        that.channels.push({
            channel_number : that.channelNumber,
            sender : sender
        });
        that.channelNumber ++;
    }

    greenLight (id) {
        console.log("green light");
        let assetId = 0;
        let contentManager = new ContentManager();
        let asset = contentManager.getAsset(assetId);
        let channel = that.channels.find(function findChannel (obj) {
            return obj.channel_number === id;
        });

        console.log("asset: " + asset);
        console.log("channel: " + channel);

        if (channel != undefined && asset != undefined) {
            that.begin(channel, asset);
        }
    }

    begin (channel, asset) {
        let i = 0;
        console.log("MMT Server begin!!! - "+asset.length);
        for (i=0; i<asset.length; i++) {
            let mpuPath = asset [i];
            channel.sender.addMPUPath(mpuPath);
            channel.sender.send();
        }
    }
}
module.exports = mmtServer;

var server = new mmtServer ();
// Server execute below
server.createServer ();

// Server debug code below
/*server.onCallSetupConnected({
    localAddress: '127.0.0.1',
    udpSenderPort: 8000
});
server.greenLight(0);*/