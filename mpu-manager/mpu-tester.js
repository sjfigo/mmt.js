var FileController = require("../util/file-controller.js");
var MPUDissolver = require("./mpu-dissolver.js");
var MPURebuilder = require("./mpu-rebuilder.js");
var MPU = require("./mmt-structure/mpu.js");
var that = null;

class MPUTester {
    constructor () {
        this.inMPUPath = null;
        this.outMPUPath = null;
        this.mpu_name = null;
        this.outMPUFsCnt = 0;

        this.mpuData = null;
        this.mpuFrags = null;

        this.fileController = new FileController ();
        this.mpuDissolver = null;
        this.mpuRebuilder = null;

        that = this;
    }

    set inPath (path) {
        this.inMPUPath = path;
    }

    set outPath (path) {
        this.outMPUPath = path;
    }

    set filename (name) {
        this.mpu_name = name;
    }

    readMPU () {
        let data = this.fileController.readBinFile(this.inMPUPath + this.mpu_name);
        this.mpuData = data;
    }

    dissolve () {
        this.mpuDissolver = new MPUDissolver (this.mpuData, this.mpuData.length);
        this.mpuFrags = this.mpuDissolver.mpuFragments;

        console.log("dissolved.");
    }

    printMPU (mpu) {
        let path = that.outMPUPath + that.mpu_name;
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

        this.mpuRebuilder.resolve();
        console.log("rebuilded.");
    }
}
module.exports = MPUTester;

var mpuTester = new MPUTester();
mpuTester.filename = "000.mp4";
mpuTester.inPath = "./mpu-manager/mpus/";
mpuTester.outPath = "./mpu-manager/OutputMPUs/";
mpuTester.readMPU();
mpuTester.dissolve();
mpuTester.rebuild();