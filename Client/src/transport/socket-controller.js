var SocketController = function () {
    /**
     * Create and connect to server by tcp socket
     * @param server ip address
     * @param server port number
     */
    var createTCPSock = function (host, port) {
        var net = require("net");
        var tcpSock = net.connect({host: host, port : port});
        
        tcpSock.on("connect", function () {
            console.log("TCP connect!");
        });

        tcpSock.on("data", function (chunk) {
            console.log("recv: " + chunk);
            if(chunk.toString() === "socket test") {
                tcpSock.write("ok");
            }
            else {
                var udpSock = createUDPSock(host, chunk);
                sendUDPSock(udpSock, "UDP socket test", chunk, host);
            }
        });

        tcpSock.on("end", function () {
            console.log("disconnected.");
        });

        tcpSock.on("error", function (err) {
            console.log(err);
        });

        tcpSock.on("timeout", function () {
            console.log("connection timeout");
        });

        return tcpSock;
    };

    var createUDPSock = function (ipAddr, port) {
        var dgram = require("dgram");
        var udpSock = dgram.createSocket("udp4");
        
        udpSock.on("error", (err) => {
            console.log("server error:\n${err.stack}");
            udpSock.close();
        });

        udpSock.on("message", (msg, rinfo) => {
            console.log("server got: ${msg} from ${rinfo.address}:${rinfo.port}");
        });

        udpSock.on("listening", () => {
            var address = udpSock.address();
            console.log("server listening ${address.address}:${address.port}");
        });


        udpSock.bind(port);

        return udpSock;
    };

    var sendUDPSock = function (udpSock, data, port, ipAddr) {
        udpSock.send(data, port, ipAddr, (err) => {
            udpSock.close();
        });
    };

    return {
        createTCPSock : createTCPSock,
        createUDPSock : createUDPSock,
        sendUDPSock : sendUDPSock
    };
};

SocketController.prototype.constructor = SocketController;

exports.SocketController = SocketController;