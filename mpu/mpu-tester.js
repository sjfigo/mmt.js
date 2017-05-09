var FileController = require("../Client/util/file-controller.js");
var MPUDissolver = require("./mpu-dissolver.js");
var MPURebuilder = require("./mpu-rebuilder.js");
var MPU = require("./MPU/mmt-structure/mpu.js");

class MPUTester {
    constructor () {
        this.mpu_path = null;
        this.inMPUPath = "./InputMPUs/";
        this.outMPUPath = "./OutputMPUs/";
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
        this.mpuData = this.fileController.readBinFile(this.mpu_path);
    }

    dissolve () {
        this.mpuDissolver = new MPUDissolver (this.mpuData, this.mpuData.length);
        this.mpuFrags = this.mpuDissolver.mpuFragments();
    }

    rebuild () {
        let i = 0;

        this.mpuRebuilder = new MPURebuilder (this.printMPU);

        for (i=0; i<mpuFrags.length; i++) {
            this.mpuRebuilder.mpuFrag(mpuFrags[i]);
        }
    }

    printMPU (mpu) {
        this.fileController.writeBinFile(this.outPath + this.outCnt + ".mp4", mpu.data);
    }
}
module.exports = MPUTester;

var mpuTester = new MPUTester();
mpuTester.path = "";
mpuTester.dissolve();
mpuTester.rebuild();