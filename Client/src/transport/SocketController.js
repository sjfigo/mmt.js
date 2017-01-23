var SocketController = function () {};

SocketContoller.prototype.createTCPSock = function (port) {
    var tcpSock = null;

    return tcpSock;
};

SocketController.prototype.connetTCPSock = function (tcpSock, ipAddr, port) {

};

SocketController.prototype.createUDPSock = function (ipAddr, port) {
    var dgram = require('dgram');
    var udpSock = dgram.createSocket('udp4');
    var onBind = function () {

    };

    udpSock.bind(port, ipAddr, onBind);

    return udpSock;
};

SocketController.prototype.sendUDPSock = function (udpSock, data) {

};