global.navigator = {
    userAgent: 'node.js'
}

const TCP_SERVER = 1;
const HTTP_SERVER = 2;

var serverType = HTTP_SERVER;

var MMTPSender = require("./mmtp-sender");
var ContentManager = require ("./mmt-content-manager");
var TcpController = require("../transport/tcp-controller");
var that = null;

var ServerIpAddr = "192.168.1.12";
var ServerPort = 1337;

class mmtServer {
    constructor () {
        if (serverType === TCP_SERVER) {
            this.server = new TcpController(); 
            this.server.onRecvCB = this.onCallSetupRecv;
            this.server.onErrorCB = this.onCallSetupError;
            this.server.onEndCB = this.onCallSetupEnd;
            this.server.onTimeoutCB = this.onCallSetupTimeout;
            this.server.onConnectedCB = this.onCallSetupConnected;
        }

        this.channels = [];
        this.channelNumber = 0;

        this.clientList = [];

        this.tcpSenderPort = 8124;
        this.udpSenderPort = 8000;

        that = this;
    }

    createServer () {
        if (serverType === TCP_SERVER) {
            this.server.createServer(this.tcpSenderPort);
        }
        else if (serverType === HTTP_SERVER) {
            let ServerListenProtocol = require("http");
            this.server = ServerListenProtocol.createServer(function (req, res) {
                req.on("data", function (chunk) {
                    if (req.url === "/callsetup/ready") {
                        if (req.method === "POST") {
                            that.onCallSetupRecv(chunk, req, res);
                        }
                    }
                    else if (req.url === "/callsetup/start") {
                        if (req.method === "POST") {
                            that.onCallSetupRecv(chunk, req, res);
                        }
                    }
                });
                req.on("end", function () {
                    if (req.url === "/callsetup/ready") {
                        if (req.method === "POST") {
                            that.onCallSetupConnected(null, req, res);
                        }
                    }
                    else if (req.url === "/callsetup/start") {
                        if (req.method === "POST") {
                            that.onCallSetupFinish(null, req, res);
                        }
                    }
                });
                console.log(req);                
            });
            this.server.listen(ServerPort, ServerIpAddr);
        }
    }

    onCallSetupRecv (chunk, req, res) {
        if (serverType === TCP_SERVER) {

        }
        else if (serverType == HTTP_SERVER) {
            if (req === null || req === undefined) {
                console.log("onCallSetupRecv - HTTP_SERVER - invalid parameter");
                return false;
            }

            let client = that.clientList.find(function (obj) {
                console.log("obj.id - " + obj.remodeAddress);
                return obj.remodeAddress === req.connection.remoteAddress && obj.url === req.url;
            });

            if (client) {
                client.chunks += chunk;
            }
            else {
                let client = {remodeAddress:req.connection.remoteAddress, url:req.url, chunks:""+chunk};
                that.clientList.push(client);
            }
        }
    }

    onCallSetupError (err) {
        console.log('Call setup error:' + err);
    }

    onCallSetupEnd () {
        console.log("mmtServer onEnd");
    }

    onCallSetupTimeout () {
        console.log("mmtServer onTimeout");
    }

    onCallSetupConnected (connect, req, res) {
        console.log("mmt-server - createServer - connect");
        if (serverType === TCP_SERVER) {
            let sender = new MMTPSender();
            if (!sender) {
                return false;
            }
            sender.setConnectInfo(that.channelNumber, connect.localAddress, that.udpSenderPort, connect.remoteAddress, null);
            sender.setTcpServer(connect);
            // connect를 통해 WebRTC 여부 판단해서 아래 적용해야 한다.
            sender.createStreamSock("webrtc");
            sender.ready();
            console.log("Connected port: " + sender.port);
            that.channels.push({
                channel_number : that.channelNumber,
                sender : sender
            });
            sender.greenLight(req, res);
            that.channelNumber ++;
        }
        else if (serverType === HTTP_SERVER) {
            let socketType = null;
            let clientPort = 0;
            let start = 0;
            let end = 0;

            if (req === null || req === undefined || res === null || res === undefined) {
                console.log("onCallSetupConnected - HTTP server - invalid parameter");
                return false;
            }

            let client = that.clientList.find(function (obj) {
                console.log("obj.id - " + obj.remodeAddress);
                return obj.remodeAddress === req.connection.remoteAddress;
            });

            if (!client) {
                console.log("No received data (" + req.connection.remoteAddress + ")");
                return false;
            }
            
            req.body = new String(client.chunks);
            that.clientList.splice(that.clientList.indexOf(client), 1);

            start = req.body.indexOf("stream-socket", 0, "utf8");
            if (start >= 0) {
                start += "stream-socket".length + 1;
                end = req.body.indexOf("|", start, "utf8");
                socketType = req.body.substring(start, end);
            }

            start = req.body.indexOf("recv-port", 0, "utf8");
            if (start >= 0) {
                start += "recv-port".length + 1;
                end = req.body.indexOf("|", start, "utf8");
                clientPort = parseInt(req.body.substring(start, end));
            }

            if (socketType === null && clientPort < 0) {
                console.log("socketType: " + socketType + " clientPort: " + clientPort);
                return false;
            }

            let sender = new MMTPSender();
            if (sender === null) {
                return false;
            }
            sender.setConnectInfo(that.channelNumber, req.connection.localAddress, that.udpSenderPort, req.socket.remoteAddress, clientPort);
            sender.setHttpMsg(req, res);
            sender.createStreamSock(socketType);
            sender.ready();
            let channelInfo = {
                channel_number : that.channelNumber,
                sender : sender
            };
            that.channels.push(channelInfo);

            that.channelNumber ++;
        }
    }

    onCallSetupFinish (channelNumber, req, res) {
        console.log("onCallSetupFinish");
        let channel = null;

        if(serverType === HTTP_SERVER && req && !channelNumber) {
            let cookie = req.headers["Cookie"];
            if (cookie) {
                channelNumber = parseInt(cookie.substring("Channel-Number=".length, cookie.length), 10);
            }
            else {
                let client = that.clientList.find(function (obj) {
                    console.log("obj.id - " + obj.remodeAddress);
                    return obj.remodeAddress === req.connection.remoteAddress && obj.url === req.url;
                });
    
                if (!client) {
                    console.log("No received data (" + req.connection.remoteAddress + ")");
                    return false;
                }
                
                req.body = new String(client.chunks);
                let tempChannelNum = req.body.indexOf("Channel-Number:");
                if (tempChannelNum >= 0) {
                    let channelStart = tempChannelNum + "Channel-Number:".length;
                    let channelEnd = req.body.indexOf("|", channelStart);
                    if (channelEnd < 0) {
                        channelEnd = req.body.length;
                    }
                    channelNumber = parseInt(req.body.substring(channelStart, channelEnd), 10);
                }
            }
        }

        if (channelNumber !== null) {
            channel = that.channels.find(function findChannel (obj) {
                return obj.channel_number === channelNumber;
            });

            if (channel) {
                channel.sender.greenLight(req, res);
            }
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