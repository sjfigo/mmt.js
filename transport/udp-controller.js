class UDPController {
    constructor () {
        this.udpSock = null;
        this.onError = null;
        this.onRecv = null;
        this.onListen = null;

        this.addr_ = null;
        this.port_ = null;
    }

    createUDPSock (size) {
        var dgram = require("dgram");
        this.udpSock = dgram.createSocket({type:"udp6", recvBufferSize:1024*1024*5});
        
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
        if (port === null || port === undefined) {
            port = this.port_;
        }
        if (ipAddr === null || ipAddr === undefined) {
            ipAddr = this.addr_;
        }
        console.log("udp controller - bind - port: "+port+", addr: "+ipAddr);
        this.udpSock.bind(port, ipAddr, cbFunc);
    }

    sendUDPSock (data, port, ipAddr) {
        if (port === null || port === undefined || ipAddr === null || ipAddr === undefined || data === undefined) {
            return false;
        }
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