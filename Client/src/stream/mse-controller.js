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