var FileController = require("../Client/util/file-controller.js");
var MPUDissolver = require("./mpu-dissolver.js");
var MPURebuilder = require("./mpu-rebuilder.js");
var MPU = require("./mmt-structure/mpu.js");

class MPUTester {
    constructor () {
        this.mpu_path = null;
        this.inMPUPath = "/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/";
        this.outMPUPath = "/Users/daehee/Git/MMT-WebPlayer/mpu-manager/OutputMPUs/";
        this.outMPUFsCnt = 0;

        this.mpuData = null;
        this.mpuFrags = null;

        this.fileController = new FileController ();
        this.mpuDissolver = null;
        this.mpuRebuilder = null;
    }

    set path (path) {
        this.mpu_path = path;
    }

    readMPU () {
        let data = this.fileController.readBinFile(this.mpu_path);
        this.mpuData = new Buffer(data);
    }

    dissolve () {
        this.mpuDissolver = new MPUDissolver (this.mpuData, this.mpuData.length);
        this.mpuFrags = this.mpuDissolver.mpuFragments;

        console.log("dissolved.");
    }

    rebuild () {
        let i = 0;

        this.mpuRebuilder = new MPURebuilder (this.printMPU);

        for (i=0; i<this.mpuFrags.length; i++) {
            this.mpuRebuilder.mpuFrag = mpuFrags[i];
        }

        console.log("rebuilded.");
    }

    printMPU (mpu) {
        let path = this.outPath + this.outCnt + ".mp4";
        console.log("Out: " + path);
        this.fileController.writeBinFile(path, mpu.data);
    }
}
module.exports = MPUTester;

var mpuTester = new MPUTester();
mpuTester.path = mpuTester.inMPUPath + "000.mp4";
mpuTester.readMPU();
mpuTester.dissolve();
mpuTester.rebuild();