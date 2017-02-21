var MMTPlayer = function (video, controller) {
    var SocketController = require("./transport/SocketController.js").SocketController;
	var init = function () {
        callSetup("172.16.39.165", 10000);
    };

	var callSetup = function (host, port) {
        var sockController = new SocketController();
        var tcpSock = sockController.createTCPSock(host, port);
    };

	var onPlay = function () {

    };

    return {
        init : init,
        callSetup : callSetup,
        onPlay : onPlay
    };
};

exports.MMTPlayer = MMTPlayer;