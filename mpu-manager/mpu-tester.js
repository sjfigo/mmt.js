var FileController = require("../Client/util/file-controller.js");
var MPUDissolver = require("./mpu-dissolver.js");
var MPURebuilder = require("./mpu-rebuilder.js");
var MPU = require("./mmt-structure/mpu.js");
var that = null;

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

        that = this;
    }

    set path (path) {
        this.mpu_path = path;
    }

    readMPU () {
        let data = this.fileController.readBinFile(this.mpu_path);
        this.mpuData = data;
    }

    dissolve () {
        this.mpuDissolver = new MPUDissolver (this.mpuData, this.mpuData.length);
        this.mpuFrags = this.mpuDissolver.mpuFragments;

        console.log("dissolved.");
    }

    printMPU (mpu) {
        let path = that.outMPUPath + that.outMPUFsCnt + ".mp4";
        console.log("Out: " + path);
        that.fileController.writeBinFile(path, mpu.data);
    }

    rebuild () {
        let i = 0;
        this.mpuRebuilder = new MPURebuilder (this.printMPU);

        console.log("this.mpuFrags.length: " + this.mpuFrags.length);
        for (i=0; i<this.mpuFrags.length; i++) {
            console.log("this.mpuFrags[i].data.length: "+this.mpuFrags[i].data.length);
            this.mpuRebuilder.mpuFrag = this.mpuFrags[i];
        }

        console.log("rebuilded.");
    }
}
module.exports = MPUTester;

var mpuTester = new MPUTester();
mpuTester.path = mpuTester.inMPUPath + "test1_The Dark Knight Rise_1080p__MPU_000.mp4";
mpuTester.readMPU();
mpuTester.dissolve();
mpuTester.rebuild();