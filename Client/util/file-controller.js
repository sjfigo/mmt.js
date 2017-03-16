class FileController {
    constructor () {
        this._fs = require("fs");
    }

    readBinFile (path) {
        try {
            this._fs.readFile(path, (err, data) => {
                if (err) {
                    throw err;
                }
                return new Uint8Array(data);
            });
        }
        catch (exception) {
            console.log(exception);
            return null;
        }
    }

    writeBinFile (path, data) {
        try {
            this._fs.writeFile(path, data, (err) => {
                if(err) {
                    throw err;
                }
                return true;
            });
            return false;
        }
        catch (exception) {
            console.log(exception);
            return false;
        }
    }
}

exports.FileController = FileController;