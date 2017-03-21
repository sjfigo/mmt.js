import Error from "../error.js";

class MSEController {
    constructor() {
        if("MediaSource" in window) {
            this._mse = new MediaSource;
            this._mimeCodecs = [];
        }
    }

    static addSourceBuffer (mimeCodec, onCreate) {
        if (!this._mimeCodecs[mimeCodec]) {
            let sourceBuffer = this._mse.addSourceBuffer(mimeCodec);
            this._mimeCodecs[mimeCodec] = sourceBuffer;
            onCreate.bind(this);
        }
    }

    createSourceBuffer (mimeCodec, onCreate) {
        if (this._mse) {
            this._mse.addEventListener("sourceopen", this.addSourceBuffer.bind(this, mimeCodec, onCreate));
        }
    }
    
    appendSegment (mimeCodec, segment) {
        if (this._mse) {
            if (!this._mimeCodecs[mimeCodec]) {
                return Error.INVALID_PARAM;
            }
            let sourceBuffer = this._mimeCodecs[mimeCodec];
            sourceBuffer.appendBuffer(segment);
        }
    }
}

exports.MSEController = MSEController;