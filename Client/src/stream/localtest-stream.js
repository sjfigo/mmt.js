class LocalTestStream {
    constructor (mpuPathList, video) {
        var FileController = require("../../util/file-controller.js").FileController;
        var MSEController = require("mse-controller.js").MSEController;

        this._mpuPathList = mpuPathList;
        this._fileController = new FileController;
        this._mseController = new MSEController;

        this._commonMimeCodec = "video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"";
        this._video = video;
    }

    onCreate() {
        let i = 0;
        let len = this._mpuPathList.length;
        for(i=0; i<len; i++) {
            let path = this._mpuPathList[i];
            let mpu = this._fileController.readBinFile(path);
            let mimeCodec = this._commonMimeCodec;

            this._mseController.appendSegment(mimeCodec, mpu);
        }
        this._video.play();
    }

    test() {
        let mimeCodec = this._commonMimeCodec;
        this._mseController.createSourceBuffer(mimeCodec, this.onCreate);
    }
}
//exports.LocalTestStream = LocalTestStream;


let video = document.querySelector("video");
let commonPath = "";
let paths = [];
paths[0] = commonPath + "/1.mpu";

let localTestStream = new LocalTestStream(paths, video);
localTestStream.test();
