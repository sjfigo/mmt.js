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