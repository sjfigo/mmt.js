var SocketController = function () {};

/**
 * Create and connect to server by tcp socket
 * @param server ip address
 * @param server port number
 */
SocketController.createTCPSock = function (host, port) {
    var net = require('net');
    var tcpSock = net.connect({host: host, port : port});

    tcpSock.on('connect', function () {
        console.log('TCP connect!');
    });

    tcpSock.on('data', function (chunk) {
        console.log('recv: ' + chunk);
    });

    tcpSock.on('end', function () {
        console.log('disconnected.');
    });

    tcpSock.on('error', function (err) {
        console.log(err);
    });

    tcpSock.on('timeout', function () {
        console.log('connection timeout');
    });

    return tcpSock;
};

SocketController.createUDPSock = function (ipAddr, port) {
    var dgram = require('dgram');
    var udpSock = dgram.createSocket('udp4');
    var onBind = function () {

    };

    udpSock.bind(port, ipAddr, onBind);

    return udpSock;
};

SocketController.prototype.sendUDPSock = function (udpSock, data) {

};