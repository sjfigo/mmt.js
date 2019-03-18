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