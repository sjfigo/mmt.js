class FileController {
    constructor () {
        this.Fs = require("fs");
    }
    
    /**
     * Return read file of the path by Buffer object
     * @param {* <string> | <Buffer> | <integer>} path
     */
    readBinFile (path) {
        return new Buffer(this.Fs.readFileSync(path));
    }

    /**
     * Write data to file of the path
     * @param {* <string> | <Buffer> | <integer>} path
     * @param {*<string> | <Buffer> | <Uint8Array>} data
     */
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