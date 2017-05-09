var LocalTestStream = require("./stream/localtest-stream.js");
var EventEmitter = require("events");
var SocketController = require("./transport/socket-controller.js");

class MMTPlayer {
    constructor (video, controller, host, port) {
        //this.callSetup("172.16.39.165", 10000);

        this.eventEmitter = new EventEmitter();
        this.eventOn = this.eventEmitter.on.bind(this.eventEmitter);
        this.eventOff = this.eventEmitter.removeListener.bind(this.eventEmitter);
        this.eventEmit = this.eventEmitter.emit.bind(this.eventEmitter);
        
        let commonPath = "";
        let paths = [];
      //paths[0] = commonPath + "src/stream/resource/Signal-Teaser.mp4";
        paths[0] = commonPath + "src/stream/resource/000.mp4";
        paths[1] = commonPath + "src/stream/resource/001.mp4";
        paths[2] = commonPath + "src/stream/resource/002.mp4";
        paths[3] = commonPath + "src/stream/resource/003.mp4";
        paths[4] = commonPath + "src/stream/resource/004.mp4";
        paths[5] = commonPath + "src/stream/resource/005.mp4";

        let localTestStream = new LocalTestStream(paths, video);
        localTestStream.test();
    }

	callSetup(host, port) {
        //var sockController = new SocketController();
        //var tcpSock = sockController.createTCPSock(host, port);
    }

	onPlay() {

    }
}

module.exports = MMTPlayer;