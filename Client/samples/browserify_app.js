(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var MMTPlayer = require("../src/mmt-player.js");

/**
 * The application layer of the test application.
 * @class
 */
var app = function() {};
/**
 * The video element owned by the app.
 *
 * @private {HTMLVideoElement}
 */
app.video = null;

/**
 * The player object owned by the app.
 *
 * @private {NexWebPlayer}
 */
app.player = null;

/**
 * The content url (mpd or m3u8)
 *
 * @private {http url string}
 */
app.contentUrl = "http://10.10.15.27:8000/dash264/TestCases/1a/netflix/exMPD_BIP_TC1.mpd";


/**
 * Initializes the application.
 */
app.init = function() {
  var playerControls = null;
  
  app.video = 
      /** @type {!HTMLVideoElement} */ (document.getElementById("videoTag"));

  app.player = new MMTPlayer(app.video, playerControls/*, contentUrl*/);
  
//  playerControls.init(app.video_);  
};

if (document.readyState == "complete" ||
    document.readyState == "interactive") {
  app.init();
} else {
  document.addEventListener("DOMContentLoaded", app.init);
}
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
},{"./stream/localtest-stream.js":3,"./transport/socket-controller.js":5,"events":8}],3:[function(require,module,exports){
var FileController = require("../../util/file-controller.js");
var MSEController = require("./mse-controller.js");

var xmlHttp = new XMLHttpRequest();
var httpReqCnt = 0;
var mpus = new Array;
var mpuPathList;

class LocalTestStream {
    constructor (mpuPaths, video) {
        mpuPathList = mpuPaths;
        this._fileController = new FileController;
        this._mseController = new MSEController();

        this._commonMimeCodec = "video/mp4; codecs=\"avc1.640028\"";
        //this._commonMimeCodec = "video/mp4; codecs=\"avc1.4d401f,mp4a.40.2\"";
        this._video = video;

        this._video.src = URL.createObjectURL(this._mseController.mse);
    }

    onProgress(e) {
        console.log("onProgress: " + httpReqCnt);
        if (this._mseController.mse.readyState === "open" && httpReqCnt > mpuPathList.length) {
            let i = 0;
            for (i=0; i<mpuPathList.length; i++) {
                this._mseController.appendSegment(this._commonMimeCodec, mpus[i]);
            }
        }
    }

    httpGet (url) {
        xmlHttp.open("GET", url, true);
        xmlHttp.responseType = "arraybuffer";
        xmlHttp.send();
        xmlHttp.onload = this.httpOnLoad;
        xmlHttp.onprogress = this.httpOnProgress;
        return true;
    }

    httpOnProgress (event) {
        console.log("onProgress: " + event.target.responseURL);
    }

    httpOnLoad (event) {
        if (event.target.responseURL.search("000.mp4") > 0) {
            mpus[0] = event.target.response;
        } else if (event.target.responseURL.search("001.mp4") > 0) {
            mpus[1] = event.target.response;
        } else if (event.target.responseURL.search("002.mp4") > 0) {
            mpus[2] = event.target.response;
        } else if (event.target.responseURL.search("003.mp4") > 0) {
            mpus[3] = event.target.response;
        } else if (event.target.responseURL.search("004.mp4") > 0) {
            mpus[4] = event.target.response;
        } else if (event.target.responseURL.search("005.mp4") > 0) {
            mpus[5] = event.target.response;
        }
        
        httpReqCnt ++;

        if (httpReqCnt > mpuPathList.length) {
            if (this._mseController.mse.readyState === "open" && httpReqCnt > mpuPathList.length) {
                let i = 0;
                for (i=0; i<mpuPathList.length; i++) {
                    this._mseController.appendSegment(this._commonMimeCodec, mpus[i]);
                }
            }
        }
    }

    test() {
        let mimeCodec = this._commonMimeCodec;
        this._mseController.createSourceBuffer(mimeCodec);
        
        mpus[0] = this.httpGet (mpuPathList[0]);
        mpus[1] = this.httpGet (mpuPathList[1]);
        mpus[2] = this.httpGet (mpuPathList[2]);
        mpus[3] = this.httpGet (mpuPathList[3]);
        mpus[4] = this.httpGet (mpuPathList[4]);
        mpus[5] = this.httpGet (mpuPathList[5]);
        
     //   this._video.addEventListener("progress", this.onProgress);
        this._video.play();
        
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

    addSourceBuffer (mimeCodec) {
        if (!this._mimeCodecs[mimeCodec]) {
            let sourceBuffer = this._mse.addSourceBuffer(mimeCodec);
            this._mimeCodecs[mimeCodec] = sourceBuffer;
        }
    }

    createSourceBuffer (mimeCodec) {
        if (this._mse && MediaSource.isTypeSupported(mimeCodec)) {
            this._mse.addEventListener("sourceopen", this.addSourceBuffer.bind(this, mimeCodec));
        }
    }
    
    appendSegment (mimeCodec, segment) {
        if (this._mse) {
            if (!this._mimeCodecs[mimeCodec]) {
                return 0;//Error.INVALID_PARAM;
            }
            let sourceBuffer = this._mimeCodecs[mimeCodec];
            let arrayBuffer = new ArrayBuffer(segment);
            sourceBuffer.appendBuffer(arrayBuffer);
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
