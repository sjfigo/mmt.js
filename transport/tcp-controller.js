var net = require("net");
var that = null;

class TcpController {
    constructor () {
        this.onRecv = null;
        this.onEnd = null;
        this.onError = null;
        this.onTimeout = null;
        this.onConnected = null;

        this.tcpSock = null;

        that = this;
    }

    createServer (port) {
        let server = net.createServer((connect) => {
            if (that.onConnected) {
                that.tcpSock = connect;
                that.onConnected (connect);
            }
        });
       
        server.on("data", function (chunk) {
            console.log(chunk);
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
    
    /**
     * Create and connect to server by tcp socket
     * @param server ip address
     * @param server port number
     */
    createClient (host, port) {
        let client = net.connect({host: host, port : port});
        this.tcpSock = client;
        client.on("connect", function () {
            console.log("TCP connect!");
            if (that.onConnected) {
                that.onConnected ();
            }
        });

        client.on("data", function (chunk) {
            console.log(chunk);
            if (that.onRecv) {
                that.onRecv(chunk);
            }
        });

        client.on("end", function () {
            console.log("disconnected.");
            if (that.onEnd) {
                that.onEnd();
            }
        });

        client.on("error", function (err) {
            console.log(err);
            if (this.onError) {
                this.onError();
            }
        });

        client.on("timeout", function () {
            console.log("connection timeout");
            if (that.onTimeout) {
                that.onTimeout();
            }
        });
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
        that.tcpSock.write(buf);
    }
}

module.exports = TcpController;