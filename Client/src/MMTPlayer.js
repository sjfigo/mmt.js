var MMTPlayer = function (video, contotller) {
    var video = document.querySelector('video');;
    var controller = contotller;

    var init = function () {
        this.video = document.querySelector('video');

        callSetup("172.16.39.133", 10000);
        
    };

    var callSetup = function (host, port) {
        var sockController = new SocketController();
        var tcpSock = SocketController.createTCPSock(host, port);
    };

    var onPlay = function () {

    };

    init();
};