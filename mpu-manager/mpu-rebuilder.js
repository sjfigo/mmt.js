var MPU = require("./mmt-structure/mpu.js");
var MPUFragment = require("./mmt-structure/mpu-fragment.js");
var AssetID = require("./mmt-structure/asset-id.js");
var MPU_Fragment_Type = require("./mmt-structure/mpu-fragment-type.js");
var moofMetadata = require("./mmt-structure/moof-metadata.js");
var MPUMetadata = require("./mmt-structure/mpu-metadata.js");
var MFU = require("./mmt-structure/mfu.js");
var AssetType = require("./mmt-structure/asset-type.js");

class MPURebuilder {
    constructor (cbPostMPU) {
        this.mpu = new MPU();
        this.mpuFrags = [];
        this.composedFragNum = 0;
        this.postMPU = cbPostMPU;
        this.moofMetadata = new moofMetadata();
        this.lastMpuSize = 0;
        this.concatedFrags = [];
    }

    /**
     * Set received MPU fragment data
     * @param {* MPUFragment} frag
     */
    set mpuFrag (frag) {
        let mpuFrag = frag;

        console.log("Set mpuFrag size: "+mpuFrag.size);
        console.log("Set mpuFrag type: "+mpuFrag.type);

        console.log("compose begin");
        if(this.postMPU !== null && this.postMPU !== undefined) {
            console.log(this.postMPU);
            if (mpuFrag.type === MPU_Fragment_Type.MPU_Metadata && this.mpuFrags.length > 0) {
                this.concatenateMPUFrags();
                this.postMPU(this.mpu);
            }
        }
        else {
            console.log("postMPU problem.")
        }

        this.composeMPUFrags(mpuFrag);
    }

    resolve () {
        if(this.postMPU !== null && this.postMPU !== undefined) {
            console.log(this.postMPU);
            this.concatenateMPUFrags();
            this.postMPU(this.mpu);
        }
        else {
            console.log("postMPU problem.")
        }
    }

    /**
     * Return 4 bytes Buffer object read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    get4ByteBuffer (buf, offset) {
        const len = 4;
        let resultBuffer = Buffer.allocUnsafe(len).fill(0x00);
        let ret = buf.copy(resultBuffer, 0, offset, offset + len);

        return resultBuffer;
    }

    /**
     * Return integer read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo4ByteBuffer (buf, offset) {
        let result = (buf.readUInt8(offset + 0) & 0xFF) << 24 | (buf.readUInt8(offset + 1) & 0xFF) << 16 | (buf.readUInt8(offset + 2) & 0xFF) << 8 | (buf.readUInt8(offset + 3) & 0xFF);
        return result;
    }

    /**
     * Return integer read 3 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo3ByteBuffer (buf, offset) {
        let result = (buf.readUInt8(offset + 0) & 0xFF) << 16 | (buf.readUInt8(offset + 1) & 0xFF) << 8 | (buf.readUInt8(offset + 2) & 0xFF);
        return result;
    }


    bufferCopy (target, targetPosition, data, dataPosition, dataLength) {
        let targetLength = target.length;
        let size = targetPosition + dataLength;
        let resultBuffer = null;

        if (targetLength > size) {
            resultBuffer = Buffer.allocUnsafe(targetLength).fill(0x00);
            target.copy(resultBuffer, 0, 0, targetLength);
            data.copy(resultBuffer, targetPosition, dataPosition, dataPosition + dataLength);
            return resultBuffer;
        }
        else {
            let resultSize = size;
            resultBuffer = Buffer.allocUnsafe(resultSize).fill(0x00);
            target.copy(resultBuffer, 0, 0, targetLength);
            data.copy(resultBuffer, targetPosition, dataPosition, dataPosition + dataLength);
        
            return resultBuffer;
        }
    }

    /**
     * Set the data to the position of MPU
     * @param {*Number} position 
     * @param {*Buffer} data 
     * @param {*Number} dataPos 
     * @param {*Number} dataSize 
     */
    setMPUFragPos (position, data, dataPos, dataSize) {
        if (dataSize > 0) {
            console.log("setMPUFragPos - Put mpuFrags to [" + position.toString() + "]");
            this.mpuFrags[position.toString()] = Buffer.allocUnsafe(dataSize).fill(0x00);
            this.mpuFrags[position.toString()] = this.bufferCopy(this.mpuFrags[position.toString()], 0, data, dataPos, dataSize);
            this.mpu.dataSize = this.mpu.dataSize + dataSize;
        }
        else {
            console.log("setMPUFragPos - DataSize is less then 0.");
        }
    }

    concatenateMPUFrags () {
        let i = 0;
        let strIterator = "0";
        let ret = false;

        if (this.mpuFrags.length === 0) {
            return ret;
        }

        if (this.mpu.dataSize > 0) {
            ret = true;
            if (this.lastMpuSize < this.mpu.dataSize) {
                if (this.mpu.data.length === 0) {
                    this.mpu.data = Buffer.allocUnsafe(this.mpu.dataSize).fill(0x00);
                }
                else {
                    let tempBuffer = Buffer.allocUnsafe(this.mpu.dataSize).fill(0x00);
                    if (this.lastMpuSize > 0) {
                        this.mpu.data = this.bufferCopy(tempBuffer, 0, this.mpu.data, 0, this.lastMpuSize);
                    }
                }
                this.lastMpuSize = this.mpu.dataSize;
            }

            while (this.mpuFrags[strIterator] !== undefined && this.mpuFrags[strIterator].length > 0) {
                let length = this.mpuFrags[strIterator].length;
                if (!this.concatedFrags.includes(i)) {
                    this.mpu.data = this.bufferCopy(this.mpu.data, i, this.mpuFrags[strIterator], 0, this.mpuFrags[strIterator].length);
                    this.mpuFrags.splice(strIterator, 1);
                    this.concatedFrags.push(i);
                }

                i += length;
                strIterator = i.toString();
            }

            if (i !== this.mpu.dataSize) {
                ret = false;
            }
        }

        return ret;
    }

    getMPUFragType (data, size) {
        let ftyp = Buffer.from("ftyp");
        let ftypLen = ftyp.length;
        let moof = Buffer.from("moof");
        let moofLen = moof.length;
        let mdat = Buffer.from("mdat");
        let mdatLen = mdat.length;

        if (size > 8) {
            let boxName = this.get4ByteBuffer(data, 4);
            if (boxName.compare(ftyp) === 0) {
                return MPU_Fragment_Type.MPU_Metadata;
            }
            else if (boxName.compare(moof) === 0) {
                return MPU_Fragment_Type.Movie_Fragment_Metadata;
            }
            else if (boxName.compare(mdat) === 0) {
                return MPU_Fragment_Type.MFU;
            }
        }
    }

    composeMPUFrags (mpuFrag) {
        let ret = false;

        let mmpu = Buffer.from("mmpu");
        let mmpuLen = mmpu.length;
        let moov = Buffer.from("moov");
        let moovLen = moov.length;

        if (mpuFrag.type === MPU_Fragment_Type.MPU_Metadata) {
            let iterator = 0;
            console.log("mpuFrag.length: " + mpuFrag.data.length);
            let boxName = this.get4ByteBuffer(mpuFrag.data, iterator + 4);

            let mpuMeta = new MPUMetadata();

            console.log("(find mmpu1) boxName: "+boxName);
            while(boxName.compare(mmpu) !== 0) {
                iterator += this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                boxName = this.get4ByteBuffer(mpuFrag.data, iterator + 4);
                console.log("(find mmpu2) boxName: "+boxName);
            }
            mpuMeta.mpu_num = this.getIntTo4ByteBuffer(mpuFrag.data, iterator +13);
            console.log("mpuMeta.mpu_num: "+mpuMeta.mpu_num);

            boxName = this.get4ByteBuffer(mpuFrag.data, iterator + 4);
            console.log("(find moov1) boxName: "+boxName);
            while(boxName.compare(moov) !== 0) {
                iterator += this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                boxName = this.get4ByteBuffer(mpuFrag.data, iterator + 4);
                console.log("(find moov2) boxName: "+boxName);
            }
            mpuMeta.moov_offset = iterator;
            console.log("mpuMeta.moov_offset: " + mpuMeta.moov_offset);
            mpuFrag.typeInfo = mpuMeta;

            ret = this.setMPUMetadata(mpuFrag);
        }
        else if (mpuFrag.type === MPU_Fragment_Type.Movie_Fragment_Metadata) {
            ret = this.setMoofMetadata(mpuFrag);
        }
        else if (mpuFrag.type === MPU_Fragment_Type.MFU) {
            let iterator = 0;
            let mfu = new MFU();
            mfu.mfu_num = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.mfu_num: "+mfu.mfu_num);
            let temp = this.get4ByteBuffer(mpuFrag.data, iterator+4);
            console.log("mfu.type: "+temp);
            iterator += 11;
            mfu.offset = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.offset: "+mfu.offset);
            iterator += 4;
            mfu.length = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.length: "+mfu.length);
            
            mpuFrag.typeInfo = mfu;
            ret = this.setMFU(mpuFrag);
        }
        else {
            // Error.
            ret = false;
            //break;
        }
        //}

        return ret;
    }

    // MPU의 사이즈를 미리 알 수 있나? spec확인
    // 일단 compose 해보자
    setMPUMetadata (mpuFrag) {
        let moov_size = 0;
        let moov_pos = 0;

        let boxName = null;
        let boxSize = 0;

        let trak = Buffer.from("trak");
        let trakLen = trak.length;
        let tkhd = Buffer.from("tkhd");
        let tkhdLen = tkhd.length;
        let mdia = Buffer.from("mdia");
        let mdiaLen = mdia.length;
        let hdlr = Buffer.from("hdlr");
        let hdlrLen = hdlr.length;
        let vide = Buffer.from("vide");
        let videLen = vide.length;
        let hint = Buffer.from("hint");
        let hintLen = hint.length;
        let mmth = Buffer.from("mmth");
        let mmthLen = mmth.length;

        //this.bufferCopy(this.mpu.data, this.mpu.descriptor, mpuFrag.data, 0, mpuFrag.size);
        this.setMPUFragPos(this.mpu.descriptor, mpuFrag.data, 0, mpuFrag.size);
        this.mpu.descriptor += mpuFrag.size;

        //this.mpu.descriptor += mpuFrag.size;
        this.mpu.mpu_meta_flag = true;

        // Begin of GetTrackIdinRebuilder
        moov_size = this.getIntTo4ByteBuffer(mpuFrag.data, mpuFrag.typeInfo.moov_offset);
        console.log("moov_size: "+moov_size);
        moov_pos = mpuFrag.typeInfo.moov_offset + 8;

        while (moov_pos < moov_size) {
            boxSize = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
            moov_pos += 4;
            boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);
            if (boxName.compare(trak) === 0) {
                let trakId = null;
                let trakSize = boxSize;
                let trakSubBoxOffset = 0;

                moov_pos += 4;
                trakSubBoxOffset = moov_pos;
                trakSize -=8;

                while (trakSize > 0) {
                    let tsbSize = 0;
                    tsbSize = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
                    moov_pos += 4;
                    boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);
                    moov_pos += 4;
                    if (boxName.compare(tkhd) === 0) {
                        //let version = Buffer.from(mpu.data, moov_pos, 1) & 0xFF;/**/
                        let version = Buffer.allocUnsafe(1).fill(0x00);
                        version = this.bufferCopy(version, 0, mpuFrag.data, moov_pos, 1);
                        version &= 0xFF;

                        if (version === 1) {
                            moov_pos += 28;
                        }
                        else {
                            moov_pos += 12;
                        }

                        trakId = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
                        break;
                    }
                    else {
                        moov_pos += (tsbSize - 4);
                    }
                    trakSize -= tsbSize;
                }

                trakSize = boxSize;
                moov_pos = trakSubBoxOffset;
                trakSize -= 8;

                while (trakSize > 0) {
                    let tsbSize = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
                    moov_pos += 4;
                    boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);
                    if (boxName.compare(mdia) === 0) {
                        let mdiaSize = tsbSize - 8;
                        moov_pos += 4;
                        console.log("mdiaSize1: "+mdiaSize);
                        while (mdiaSize > 0) {
                            let msbSize = this.getIntTo4ByteBuffer(mpuFrag.data, moov_pos);
                            console.log("msbSize: "+msbSize);
                            moov_pos += 4;
                            boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);                            
                            if(boxName.compare(hdlr) === 0) {
                                moov_pos += 12;
                                boxName = this.get4ByteBuffer(mpuFrag.data, moov_pos);
                                if (boxName.compare(vide) === 0) {
                                    this.mpu.video_trak_id = trakId;
                                }
                                else if(boxName.compare(hint) === 0) {
                                    this.mpu.hint_trak_id = trakId;
                                }
                                trakSubBoxOffset -= 4;
                                break;
                            }
                            moov_pos += (msbSize - 4);
                            mdiaSize -= msbSize;
                            console.log("mdiaSize2: "+mdiaSize);
                        }
                        break;
                    }
                    else {
                        moov_pos += (tsbSize - 4);
                    }
                    trakSize -= tsbSize;
                }
                moov_pos = trakSubBoxOffset;
            }
            moov_pos += (boxSize - 4);
        }
        moov_pos = mpuFrag.data.indexOf(mmth);
        moov_pos += 18;
        this.mpu.asset_type = (mpuFrag.data[moov_pos] & 0x40) >> 6;
        // End of GetTrackIdinRebuilder

        if (this.mpu.video_trak_id !== null && this.mpu.hint_trak_id !== null) {
            return true;
        }
        else {
            return false;
        }
    }

    setMoofMetadata (mpuFrag) {
        if (this.moofMetadata.first_moof_flag) {
            this.moofMetadata.first_moof_flag = 0;
        }
        else {
            this.mpu.descriptor = this.moofMetadata.mdat_offset + this.moofMetadata.mdat_size;
        }

        this.setMPUFragPos(this.mpu.descriptor, mpuFrag.data, 0, mpuFrag.size);

        console.log("--- setMoofMetadata ---");
        console.log("this.mpu.descriptor: " + this.mpu.descriptor);
        console.log("mpuFrag.size: " + mpuFrag.size);
        this.mpu.moof_offset = this.mpu.descriptor;
        this.mpu.descriptor += mpuFrag.size;
        this.moofMetadata.mdat_offset = this.mpu.descriptor - 8;
        console.log("this.moofMetadata.mdat_offset: " + this.moofMetadata.mdat_offset);
        this.moofMetadata.mdat_size = this.getIntTo4ByteBuffer(mpuFrag.data, mpuFrag.size-8);
        this.mpu.video_sample_count = 0;

        return true;
    }

    setMFU (mpuFrag) {
        let hintSampleSize = 4;

        if (this.mpu.asset_type === 1) {
            hintSampleSize += 26;
        }
        else {
            hintSampleSize += 2;
        }

        if (mpuFrag.typeInfo.mfu_num !== mpuFrag.typeInfo.next_mfu_num) {
            while (mpuFrag.typeInfo.mfu_num > mpuFrag.typeInfo.next_mfu_num) {
                //mmte_khu1_GetSampleOffsetinRebuilder
                this.getSampleOffset(mpuFrag);
                mpuFrag.typeInfo.next_mfu_num++;
            }
        }

        //mmte_khu1_GetSampleOffsetinRebuilder
        this.getSampleOffset(mpuFrag);
        
        this.setMPUFragPos(mpuFrag.hint_sample_offset, mpuFrag.data, 0, hintSampleSize);
        this.setMPUFragPos(mpuFrag.video_sample_offset, mpuFrag.data, hintSampleSize, mpuFrag.size - hintSampleSize);

        return true;
    }


    getSampleOffset (mpuFrag) {
        //console.log("---getSampleOffset---");
        //console.log("this.mpu.descriptor: " + this.mpu.descriptor);
        //console.log("this.mpu.moof_offset: "+this.mpu.moof_offset);
        let iterator = 0;

        let boxName = null;
        let msbSize = 0;
        let traf = Buffer.from("traf");
        let trafLen = traf.length;
        let tfhd = Buffer.from("tfhd");
        let tfhdLen = tfhd.length;
        let trun = Buffer.from("trun");
        let trunLen = trun.length;

        if (this.mpu.video_sample_count === 0) {
            let moof = this.mpuFrags[this.mpu.moof_offset.toString()];
            let moofboxsize = this.getIntTo4ByteBuffer(moof, iterator) - 8;
            iterator += 8;

            console.log("moofboxsize: " + moofboxsize);

            while (moofboxsize > 0) {
                msbSize = this.getIntTo4ByteBuffer(moof, iterator);
                iterator += 4;

                console.log("msbSize: " + msbSize);

                boxName = this.get4ByteBuffer(moof, iterator);
                if (boxName.compare(traf) === 0) {
                    iterator += 4;
                    let trafSize = msbSize;
                    let tsbPtr = iterator;
                    let tSize = trafSize - 8;
                    let tfhdFlags = false;
                    let trafId = null;
                    let baseDataOffset = 0;
                    let tsbSize = 0;

                    while (tSize > 0) {
                        tsbSize = this.getIntTo4ByteBuffer(moof, iterator);
                        iterator += 4;

                        boxName = this.get4ByteBuffer(moof, iterator);
                        if (boxName.compare(tfhd) === 0) {
                            iterator += 4;

                            let tfhdPrt = iterator;
                            tfhdFlags = this.getIntTo3ByteBuffer(moof, iterator+1);
                            iterator += 4;
                            trafId = this.getIntTo4ByteBuffer(moof, iterator);
                            iterator += 4;

                            if (tfhdFlags & 0x01) {
                                baseDataOffset = this.getIntTo4ByteBuffer(moof, iterator);
                                iterator += 4;
                                baseDataOffset = baseDataOffset << 32 | this.getIntTo4ByteBuffer(moof, iterator);
                                iterator += 4;
                            }
                            else {
                                baseDataOffset = this.mpu.moof_offset;
                            }

                            iterator = tfhdPrt;
                            break;
                        }
                        iterator += (tsbSize - 4);
                        tSize -= tsbSize;
                    }

                    iterator = tsbPtr;
                    tSize = trafSize - 8;

                    while (tSize > 0) {
                        tsbSize = this.getIntTo4ByteBuffer(moof, iterator);
                        iterator += 4;

                        boxName = this.get4ByteBuffer(moof, iterator);
                        if (boxName.compare(trun) === 0) {
                            iterator += 4;
                            break;
                        }
                        iterator += (tsbSize - 4);
                        tSize -= tsbSize;
                    }

                    if (trafId === this.mpu.video_trak_id) {
                        let flags = null;
                        let sample_count = 0;
                        let data_offset = 0;
                        let skipNum = 0;
                        let sizeValuePtr = 0;

                        flags = this.getIntTo3ByteBuffer(moof, iterator + 1);
                        iterator += 4;
                        sample_count = this.getIntTo4ByteBuffer(moof, iterator);
                        iterator += 4;

                        if (flags & 0x01) {
                            data_offset = this.getIntTo4ByteBuffer(moof, iterator);
                            iterator += 4;
                        }
                        if (flags & 0x04) {
                            iterator += 4;
                        }

                        skipNum = 0;
                        if (flags & 0x100) {
                            iterator += 4;
                            skipNum += 4;
                        }
                        if (flags & 0x200) {
                            sizeValuePtr = iterator;
                            skipNum += 4;
                        }
                        if (flags & 0x400) {
                            skipNum += 4;
                        }
                        if (flags & 0x800) {
                            skipNum += 4;
                        }

                        this.mpu.video_sample_count = sample_count;
                        mpuFrag.video_sample_size_offset = sizeValuePtr;// + this.mpu.moof_offset;
                        mpuFrag.video_sample_size_seek_num = skipNum;
                        mpuFrag.video_sample_offset = baseDataOffset + data_offset;
                    }
                    
                    if(trafId === this.mpu.hint_trak_id) {
                        iterator += 8;
                        let data_offset = this.getIntTo4ByteBuffer(moof, iterator);
                        iterator += 4;

                        mpuFrag.hint_sample_offset = baseDataOffset + data_offset;
                        //this.mpu.hint_sample_offset = baseDataOffset + data_offset;
                    }

                    iterator = tsbPtr - 4;
                }
                iterator += msbSize - 4;
                moofboxsize -= msbSize;
            }
        }
        else {
            let video_sample_size = 0;
            let hint_sample_size = 0;

            iterator = mpuFrag.video_sample_size_offset;
            video_sample_size = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            iterator += 4;

            hint_sample_size = 4;
            if (mpuFrag.asset_type === AssetType.timed) {
                hint_sample_size += 26;
            }
            else {
                hint_sample_size += 2;
            }

            mpuFrag.video_sample_size_offset += mpuFrag.video_sample_size_seek_num;
            mpuFrag.video_sample_offset += video_sample_size;
            mpuFrag.hint_sample_offset += hint_sample_size;
        }
    }
}
module.exports = MPURebuilder;

var postRebuild = function (mpu) {
    fileController.writeBinFile(path, mpu.data);
};

/*
var FileController = require("../Client/util/file-controller.js");
var fileController = new FileController();
var mpu_path = "/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/000.mp4";
var mpuData = fileController.readBinFile(mpu_path);
if (mpuData === null) {
    console.log("1 - NULL");
}
var mpuRebuilder = new MPURebuilder();
mpuRebuilder.mpuFrag = mpuData;
*/