(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var MMTPlayer = require("../src/mmt-player.js");

var playerControls = function() {};


/** @private {boolean} */
playerControls.isLive_;


/** @private {boolean} */
playerControls.isSeeking_;


/** @private {HTMLVideoElement} */
playerControls.video_;


/** @private {!{start: number, end: number}} */
playerControls.seekRange_ = {start: 0, end: 0};


/** @private {MMTPlayer} */
playerControls.player_ = null;


/** @private {NXPROTOCOL_ContentInfo} */
playerControls.contentInfo_ = null;


/**
 * Initializes the player controls.
 * @param {!HTMLVideoElement} video
 */
playerControls.init = function(video) {
	var videoContainer = document.getElementById("videoContainer");
	var playButton = document.getElementById("playButton");
	var pauseButton = document.getElementById("pauseButton");
	var seekBar = document.getElementById("seekBar");
	var muteButton = document.getElementById("muteButton");
	var unmuteButton = document.getElementById("unmuteButton");
	var volumeBar = document.getElementById("volumeBar");
	var fullscreenButton = document.getElementById("fullscreenButton");
	var currentTime = document.getElementById("currentTime");
	var rewindButton = document.getElementById("rewindButton");
	var fastForwardButton = document.getElementById("fastForwardButton");
	var castButton = document.getElementById("castButton");
	var castConnectedButton = document.getElementById("castConnectedButton");
	var propertyButton = document.getElementById("property");

  // IE11 doesn"t treat the "input" event correctly.
  // https://connect.microsoft.com/IE/Feedback/Details/856998
  // If you know a better way than a userAgent check to handle this, please
  // send a patch.
	var sliderInputEvent = "input";
  // This matches IE11, but not Edge.  Edge does not have this problem.
	if (navigator.userAgent.indexOf("Trident/") >= 0) {
		sliderInputEvent = "change";
	}

	playerControls.isLive_ = false;
	playerControls.isSeeking_ = false;
	playerControls.video_ = video;
	playerControls.player_ = new MMTPlayer();

  // play
	playButton.addEventListener("click", function() {
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			playerControls.player_.play();
		}
		else {
			if (!video.src) {
				return;
			}
			playerControls.player_.setPlaybackRate(1);
			video.play();
		}
	});
	video.addEventListener("play", function() {
		playerControls.displayPlayButton(false);
	});

  // pause
	pauseButton.addEventListener("click", function() {
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			playerControls.player_.pause();
		}
		else {
			video.pause();
		}
	});
	video.addEventListener("pause", function() {
		if (!playerControls.isSeeking_) {
			playerControls.displayPlayButton(true);
		}
	});

  // seek
	var seekTimeoutId = null;
	var onSeekStart = function() {
		playerControls.isSeeking_ = true;
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			MMTPlayer.pause();
		} else {
			video.pause();
		}
	};
	var onSeekInputTimeout = function() {
		seekTimeoutId = null;
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			MMTPlayer.setCurrentTime(seekBar.value);
		} 
		else {
			video.currentTime = seekBar.value;
		}
	};
	var onSeekInput = function() {
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			if (!MMTPlayer.currentMediaDuration) {
				return;
			}
		}
		else if (!video.duration) {
      // Can"t seek.  Ignore.
			return;
		}

  // Update the UI right away.
		playerControls.updateTimeAndSeekRange();

  // Collect input events and seek when things have been stable for 100ms.
		if (seekTimeoutId) {
			window.clearTimeout(seekTimeoutId);
		}
		seekTimeoutId = window.setTimeout(onSeekInputTimeout, 100);
	};
	var onSeekEnd = function() {
		if (seekTimeoutId) {
			window.clearTimeout(seekTimeoutId);
			onSeekInputTimeout();
		}

		playerControls.isSeeking_ = false;
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			MMTPlayer.play();
		} else {
			video.play();
		}
	};
	seekBar.addEventListener("mousedown", onSeekStart);
	seekBar.addEventListener("touchstart", onSeekStart);
	seekBar.addEventListener(sliderInputEvent, onSeekInput);
	seekBar.addEventListener("mouseup", onSeekEnd);
	seekBar.addEventListener("touchend", onSeekEnd);
  // initialize seek bar with 0
	seekBar.value = 0;

  // mute/unmute
	muteButton.addEventListener("click", function() {
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			playerControls.player_.mute(true);
		} else {
			video.muted = true;
		}
	});
	unmuteButton.addEventListener("click", function() {
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			playerControls.player_.mute(false);
		} else {
			video.muted = false;
		}
	});

  // volume
	volumeBar.addEventListener(sliderInputEvent, function() {
		if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
			playerControls.player_.setVolume(volumeBar.value);
			playerControls.player_.mute(false);
		} else {
			video.volume = volumeBar.value;
			video.muted = false;
		}
	});

	video.addEventListener("volumechange", playerControls.onVolumeChange);

  // initialize volume display with a fake event
	playerControls.onVolumeChange();

  // current time & seek bar updates
	video.addEventListener("timeupdate", function() {
		if (!playerControls.isLive_) {
			playerControls.updateTimeAndSeekRange();
		}
	});

  // fullscreen
	fullscreenButton.addEventListener("click", function() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			videoContainer.requestFullscreen();
		}
	});

  // fullscreen updates
	var normalSize = {};
	document.addEventListener("fullscreenchange", function() {
		if (document.fullscreenElement) {
  // remember previous size
			normalSize.w = videoContainer.style.width;
			normalSize.h = videoContainer.style.height;
  // expand the container
			videoContainer.style.width = "100%";
			videoContainer.style.height = "100%";
		} else {
  // restore the previous size
			videoContainer.style.width = normalSize.w;
			videoContainer.style.height = normalSize.h;
		}
	});

	propertyButton.addEventListener("click", function() {

	});


  // Jump to LIVE if the user clicks on the current time.
	currentTime.addEventListener("click", function() {
		if (playerControls.isLive_) {
			video.currentTime = seekBar.max;
		}
	});

  // trick play
	rewindButton.addEventListener("click", playerControls.onRewind);
	fastForwardButton.addEventListener("click", playerControls.onFastForward);

  // cast
	castButton.addEventListener("click", MMTPlayer.launch);
  // stop casting
	castConnectedButton.addEventListener("click", MMTPlayer.stop);
};


/**
 * Set the player. Is needed for trick play.
 * @param {shaka.player.Player} player
 */
playerControls.setPlayer = function(player) {
	playerControls.player_ = player;
};


/**
 * Changes the play/pause button display.
 * @param {boolean} play True if play should be displayed, false if pause.
 */
playerControls.displayPlayButton = function(play) {
	document.getElementById("pauseButton").style.display =
      play ? "none" : "block";
	document.getElementById("playButton").style.display = play ? "block" : "none";
};


/**
 * Updates the controls to display whether cast is connected.
 * @param {boolean} connected True if cast is connected.
 */
playerControls.displayCastConnection = function(connected) {
	document.getElementById("castButton").style.display =
      connected ? "none" : "block";
	document.getElementById("castConnectedButton").style.display =
      connected ? "block" : "none";
	document.getElementById("fullscreenButton").style.display =
      connected ? "none" : "block";
};


/**
 * Updates the controls to reflect volume changes.
 */
playerControls.onVolumeChange = function() {
	var muted, volume;
	var muteButton = document.getElementById("muteButton");
	var unmuteButton = document.getElementById("unmuteButton");
	var volumeBar = document.getElementById("volumeBar");
	if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
		muted = MMTPlayer.currentMediaMuted;
		volume = MMTPlayer.currentMediaVolume;
	} else {
		var video = playerControls.video_;
		muted = video.muted;
		volume = video.volume;
	}
	if (muted) {
		muteButton.style.display = "none";
		unmuteButton.style.display = "block";
	} else {
		unmuteButton.style.display = "none";
		muteButton.style.display = "block";
	}

	volumeBar.value = muted ? 0 : volume;
	var gradient = ["to right"];
	gradient.push("#ccc " + (volumeBar.value * 100) + "%");
	gradient.push("#000 " + (volumeBar.value * 100) + "%");
	gradient.push("#000 100%");
	volumeBar.style.background = "linear-gradient(" + gradient.join(",") + ")";
};


/**
 * Called by the application to set the buffering state.
 * @param {boolean} bufferingState
 */
playerControls.onBuffering = function(bufferingState) {
	var bufferingSpinner = document.getElementById("bufferingSpinner");
	bufferingSpinner.style.display = bufferingState ? "inherit" : "none";
};


/**
 * Called by the application when the seek range changes.
 * @param {Event|{start: number, end: number}} event
 */
playerControls.onSeekRangeChanged = function(event) {
	playerControls.seekRange_.start = event.start;
	playerControls.seekRange_.end = event.end;
	playerControls.updateTimeAndSeekRange();
};


/**
 * Called by the application to set the live playback state.
 * @param {boolean} liveState True if the stream is live.
 */
playerControls.setLive = function(liveState) {
	playerControls.isLive_ = liveState;
};


/**
 * Called when rewind button is pressed. Will circle play between -1, -2, -4
 * and -8 playback rates.
 */
playerControls.onRewind = function() {
	if (!playerControls.player_) return;
	var rate = playerControls.player_.getPlaybackRate();
	playerControls.player_.setPlaybackRate(
      rate > 0 || rate < -4 ? -1.0 : rate * 2);
	playerControls.video_.play();
};


/**
 * Called when fastForward button is pressed. Will circle play between 1, 2,
 * 4 and 8 playback rates.
 */
playerControls.onFastForward = function() {
	if (!playerControls.player_) return;
	var rate = playerControls.player_.getPlaybackRate();
	playerControls.player_.setPlaybackRate(rate < 0 || rate > 4 ? 1.0 : rate * 2);
	playerControls.video_.play();
};


/**
 * Called by the application to switch trick play controls and the seek bar.
 * @param {boolean} enable True if trick play should be enabled, if false
 *    seekbar will be enabled.
 */
playerControls.enableTrickPlayButtons = function(enable) {
	var seekBar = document.getElementById("seekBar");
	var rewindButton = document.getElementById("rewindButton");
	var fastForwardButton = document.getElementById("fastForwardButton");
	rewindButton.style.display = enable ? "block" : "none";
	fastForwardButton.style.display = enable ? "block" : "none";
	seekBar.style.display = enable ? "none" : "block";
};


/**
 * Called when the seek range or current time need to be updated.
 */
playerControls.updateTimeAndSeekRange = function() {
	var displayTime, duration, bufferedLength, bufferedStart, bufferedEnd;
	if (MMTPlayer.state == MMTPlayer.states.CAST_CONNECTED) {
		displayTime = MMTPlayer.currentMediaTime;
		duration = MMTPlayer.currentMediaDuration;
		bufferedLength = MMTPlayer.currentMediaBuffered.length;
		bufferedStart = MMTPlayer.currentMediaBuffered.start;
		bufferedEnd = MMTPlayer.currentMediaBuffered.end;
	} else {
		var video = playerControls.video_;
		displayTime = video.currentTime;
		duration = video.duration;
		bufferedLength = video.buffered.length;
		bufferedStart = bufferedLength ? video.buffered.start(0) : 0;
		bufferedEnd = bufferedLength ? video.buffered.end(0) : 0;
	}

	var seekRange = playerControls.seekRange_;
	var currentTime = document.getElementById("currentTime");
	var seekBar = document.getElementById("seekBar");

	if (playerControls.isSeeking_) {
		displayTime = seekBar.value;
	}

	var showHour = null;
  // Set |currentTime|.
	if (playerControls.isLive_) {
    // The amount of time we are behind the live edge.
		displayTime = Math.max(0, Math.floor(seekRange.end - displayTime));
		showHour = (seekRange.end - seekRange.start) >= 3600;

    // Consider "LIVE" when 1 second or less behind the live-edge.  Always show
    // the full time string when seeking, including the leading "-"; otherwise,
    // the time string "flickers" near the live-edge.
		if ((displayTime > 1) || playerControls.isSeeking_) {
			currentTime.textContent =
          "- " + playerControls.buildTimeString_(displayTime, showHour);
		} else {
			currentTime.textContent = "LIVE";
		}

		seekBar.min = seekRange.start;
		seekBar.max = seekRange.end;
		if (!playerControls.isSeeking_) {
			seekBar.value = seekRange.end - displayTime;
		}
	} else {
		showHour = duration >= 3600;
		currentTime.textContent =
        playerControls.buildTimeString_(displayTime, showHour);

		seekBar.min = 0;
		seekBar.max = duration;
		if (!playerControls.isSeeking_) {
			seekBar.value = displayTime;
		}
	}

	var gradient = ["to right"];
	if (bufferedLength == 0) {
		gradient.push("#000 0%");
	} else {
    // NOTE: the fallback to zero eliminates NaN.
		var bufferStartFraction = (bufferedStart / duration) || 0;
		var bufferEndFraction = (bufferedEnd / duration) || 0;
		var playheadFraction = (displayTime / duration) || 0;

		if (playerControls.isLive_) {
			var bufferStart = Math.max(bufferedStart, seekRange.start);
			var bufferEnd = Math.min(bufferedEnd, seekRange.end);
			var seekRangeSize = seekRange.end - seekRange.start;
			var bufferStartDistance = bufferStart - seekRange.start;
			var bufferEndDistance = bufferEnd - seekRange.start;
			var playheadDistance = displayTime - seekRange.start;
			bufferStartFraction = (bufferStartDistance / seekRangeSize) || 0;
			bufferEndFraction = (bufferEndDistance / seekRangeSize) || 0;
			playheadFraction = (playheadDistance / seekRangeSize) || 0;
		}

		gradient.push("#000 " + (bufferStartFraction * 100) + "%");
		gradient.push("#ccc " + (bufferStartFraction * 100) + "%");
		gradient.push("#ccc " + (playheadFraction * 100) + "%");
		gradient.push("#444 " + (playheadFraction * 100) + "%");
		gradient.push("#444 " + (bufferEndFraction * 100) + "%");
		gradient.push("#000 " + (bufferEndFraction * 100) + "%");
	}
	seekBar.style.background = "linear-gradient(" + gradient.join(",") + ")";
};


/**
 * Builds a time string, e.g., 01:04:23, from |displayTime|.
 *
 * @param {number} displayTime
 * @param {boolean} showHour
 * @return {string}
 * @private
 */
playerControls.buildTimeString_ = function(displayTime, showHour) {
	var h = Math.floor(displayTime / 3600);
	var m = Math.floor((displayTime / 60) % 60);
	var s = Math.floor(displayTime % 60);
	if (s < 10) s = "0" + s;
	var text = m + ":" + s;
	if (showHour) {
		if (m < 10) text = "0" + text;
		text = h + ":" + text;
	}
	return text;
};

/**
 * Set content information (Streams, tracks, and etc.)
 * 
 * @param {NXPROTOCOL_ContentInfo} contentInfo
 */
playerControls.setContentInfo = function (contentInfo) {
	playerControls.contentInfo_ = contentInfo;
};


},{"../src/mmt-player.js":2}],2:[function(require,module,exports){
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

     //   video = document.querySelector("video");
        let commonPath = "";
        let paths = [];
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
},{"./stream/localtest-stream.js":3,"./transport/socket-controller.js":5,"events":8}],3:[function(require,module,exports){
var FileController = require("../../util/file-controller.js");
var MSEController = require("./mse-controller.js");

class LocalTestStream {
    constructor (mpuPathList, video) {
        this._mpuPathList = mpuPathList;
        this._mpus = new Array;
        this._fileController = new FileController;
        this._mseController = new MSEController();

        this._commonMimeCodec = "video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"";
        this._video = video;

        this._video.src = URL.createObjectURL(this._mseController.mse);
    }

    onCreate() {
        let i = 0;
        let len = this._mpuPathList.length;
        for(i=0; i<len; i++) {
            let mimeCodec = this._commonMimeCodec;

            this._mseController.appendSegment(mimeCodec, this.mpus[i]);
        }
        this._video.play();
    }

    httpGet (url) {
        let xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", url, false);
        xmlHttp.send();
        return xmlHttp.response;
    }

    test() {
        let mimeCodec = this._commonMimeCodec;
        this._mseController.createSourceBuffer(mimeCodec, this.onCreate);

        /*this._mpus[0] = this._fileController.readBinFile(this._mpuPathList[0]);
        this._mpus[1] = this._fileController.readBinFile(this._mpuPathList[1]);
        this._mpus[2] = this._fileController.readBinFile(this._mpuPathList[2]);
        this._mpus[3] = this._fileController.readBinFile(this._mpuPathList[3]);
        this._mpus[4] = this._fileController.readBinFile(this._mpuPathList[4]);
        this._mpus[5] = this._fileController.readBinFile(this._mpuPathList[5]);*/
        
        this._mpus[0] = this.httpGet (this._mpuPathList[0]);
        this._mpus[1] = this.httpGet (this._mpuPathList[1]);
        this._mpus[2] = this.httpGet (this._mpuPathList[2]);
        this._mpus[3] = this.httpGet (this._mpuPathList[3]);
        this._mpus[4] = this.httpGet (this._mpuPathList[4]);
        this._mpus[5] = this.httpGet (this._mpuPathList[5]);

        this._mseController.appendSegment(this._commonMimeCodec, this._mpus[0]);
        this._mseController.appendSegment(this._commonMimeCodec, this._mpus[1]);
        this._mseController.appendSegment(this._commonMimeCodec, this._mpus[2]);
        this._mseController.appendSegment(this._commonMimeCodec, this._mpus[3]);
        this._mseController.appendSegment(this._commonMimeCodec, this._mpus[4]);
        this._mseController.appendSegment(this._commonMimeCodec, this._mpus[5]);
    }
}

module.exports = LocalTestStream;

/*
let video = document.querySelector("video");
let commonPath = "";
let paths = [];
paths[0] = commonPath + "/1.mpu";

let localTestStream = new LocalTestStream(paths, video);
localTestStream.test();
*/
},{"../../util/file-controller.js":6,"./mse-controller.js":4}],4:[function(require,module,exports){
//var Error = require("../error.js").Error;

class MSEController {
    constructor() {
        if("MediaSource" in window) {
            this._mse = new MediaSource;
            this._mimeCodecs = [];
        }
    }

    get mse () {
        return this._mse;
    }

    addSourceBuffer (mimeCodec, onCreate) {
        if (!this._mimeCodecs[mimeCodec]) {
            let sourceBuffer = this._mse.addSourceBuffer(mimeCodec);
            this._mimeCodecs[mimeCodec] = sourceBuffer;
            onCreate.bind(this);
        }
    }

    createSourceBuffer (mimeCodec, onCreate) {
        if (this._mse && MediaSource.isTypeSupported(mimeCodec)) {
            this._mse.addEventListener("sourceopen", this.addSourceBuffer.bind(this, mimeCodec, onCreate));
        }
    }
    
    appendSegment (mimeCodec, segment) {
        if (this._mse) {
            if (!this._mimeCodecs[mimeCodec]) {
                return 0;//Error.INVALID_PARAM;
            }
            let sourceBuffer = this._mimeCodecs[mimeCodec];
            sourceBuffer.appendBuffer(segment);
        }
    }
}

module.exports = MSEController;
},{}],5:[function(require,module,exports){
class SocketController {
    constructor () {

    }
    
    /**
     * Create and connect to server by tcp socket
     * @param server ip address
     * @param server port number
     */
    createTCPSock (host, port) {
        var Net = require("net");
        var tcpSock = Net.connect({host: host, port : port});
        
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
    }

    createUDPSock (ipAddr, port) {
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
    }

    sendUDPSock (udpSock, data, port, ipAddr) {
        udpSock.send(data, port, ipAddr, (err) => {
            udpSock.close();
        });
    }
}

exports.SocketController = SocketController;
},{"dgram":7,"net":7}],6:[function(require,module,exports){
class FileController {
    constructor () {
        this.Fs = require("fs");
    }
    
    readBinFile (path) {
        return this.Fs.readFileSync(path);
    }

    writeBinFile (path, data) {
        this.Fs.writeFileSync(path, data);
        return true;
    }
}

module.exports = FileController;

/*
let fileController = new FileController;
let data = fileController.readBinFile("/Users/daehee/Git/MMT-WebPlayer/Client/src/stream/resource/000.mp4");
console.log(data);
let ret = fileController.writeBinFile("/Users/daehee/Git/MMT-WebPlayer/Client/src/stream/resource/100.mp4", data);
console.log(ret);
*/
},{"fs":7}],7:[function(require,module,exports){

},{}],8:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[1]);
