var MPU = require("./mmt-structure/mpu.js");
var MPUFragment = require("./mmt-structure/mpu-fragment.js");
var AssetID = require("./mmt-structure/asset-id.js");
var MPU_Fragment_Type = require("./mmt-structure/mpu-fragment-type.js");
var moofMetadata = require("./mmt-structure/moof-metadata.js");
var MPUMetadata = require("./mmt-structure/mpu-metadata.js");
var MFU = require("./mmt-structure/mfu.js");

class MPURebuilder {
    constructor (cbPostMPU) {
        this.mpu = new MPU();
        this.mpuFrags = [];
        this.composedFragNum = 0;
        this.postMPU = cbPostMPU;
        this.moofMetadata = new moofMetadata();
    }

    /**
     * Set received MPU fragment data
     * @param {* MPUFragment} frag
     */
    set mpuFrag (frag) {
        let mpuFrag = frag;
        //let size = mpuFragData.length;
        //let type = this.getMPUFragType (mpuFragData, size);
        //let mpuFragment = new MPUFragment(type, mpuFragData, size);

        console.log("Set mpuFrag size: "+mpuFrag.size);
        
        //this.mpuFrags.push(mpuFrag);
        //console.log("Number of mpu frags: "+this.mpuFrags.length);

        console.log("compose begin");
        if (this.composeMPUFrags(mpuFrag)){
            if(this.postMPU !== null && this.postMPU !== undefined) {
                console.log(this.postMPU);
                this.concatenateMPUFrags();
                this.postMPU(this.mpu);
            }
            else {
                console.log("postMPU problem.")
            }
        }
        else {
            console.log("compose fail");
        }
    }

    /**
     * Return 4 bytes Buffer object read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    get4ByteBuffer (buf, offset) {
        const len = 4;
        //console.log(buf);
        let resultBuffer = Buffer.allocUnsafe(len).fill(0x00);

        let ret = buf.copy(resultBuffer, 0, offset, offset + len);

        console.log("get4ByteBuffer: ");
        console.log("ret: " + ret);
        console.log("offset: " + offset);
        console.log(resultBuffer.toString());
        console.log(resultBuffer.length);
        console.log("get4ByteBuffer - buf.legnth: "+buf.length+", offset: "+offset);
        return resultBuffer;
    }

    /**
     * Return integer read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo4ByteBuffer (buf, offset) {
        let result = (buf.readUInt8(offset + 0) & 0xFF) << 24 | (buf.readUInt8(offset + 1) & 0xFF) << 16 | (buf.readUInt8(offset + 2) & 0xFF) << 8 | (buf.readUInt8(offset + 3) & 0xFF);
        console.log("getIntTo4ByteBuffer: ");
        console.log(result);
        console.log("getIntTo4ByteBuffer - buf.legnth: "+buf.length+", offset: "+offset);
        return result;
    }

    /**
     * Return integer read 3 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo3ByteBuffer (buf, offset) {
        let result = (buf.readUInt8(offset + 0) & 0xFF) << 16 | (buf.readUInt8(offset + 1) & 0xFF) << 8 | (buf.readUInt8(offset + 2) & 0xFF);
        console.log("getIntTo3ByteBuffer: ");
        console.log(result);
        console.log("getIntTo3ByteBuffer - buf.legnth: "+buf.length+", offset: "+offset);
        return result;
    }


    bufferCopy (target, targetPosition, data, dataPosition, dataLength) {
        let targetLength = target.length;
        let size = targetPosition + dataLength;
        let resultBuffer = null;

        console.log("bufferCopy - data.length: "+data.length+", dataPosition: "+dataPosition);

        if (targetLength > size) {
            resultBuffer = Buffer.allocUnsafe(targetLength).fill(0x00);
            target.copy(resultBuffer, 0, 0, targetLength);
            //console.log("1-1: " + resultBuffer.toString());
            data.copy(resultBuffer, targetPosition, dataPosition, dataPosition + dataLength);
            //console.log("1-2: " + resultBuffer.toString());
            return resultBuffer;
        }
        else {
            let resultSize = size;
            resultBuffer = Buffer.allocUnsafe(resultSize).fill(0x00);
            target.copy(resultBuffer, 0, 0, targetLength);
            //console.log("2-1: " + resultBuffer.toString());
            data.copy(resultBuffer, targetPosition, dataPosition, dataPosition + dataLength);
            //console.log("2-2: " + resultBuffer.toString());
        
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
        this.mpuFrags[position.toString()] = Buffer.allocUnsafe(dataSize).fill(0x00);
        this.mpuFrags[position.toString()] = this.bufferCopy(this.mpuFrags[position.toString()], 0, data, dataPos, dataSize);
        this.mpu.size = this.mpu.size + dataSize;
    }

    concatenateMPUFrags () {
        let i = 0;
        let strIterator = "0";
        let ret = true;

        if (this.mpuFrags.length === 0) {
            ret = false;
            return ret;
        }

        this.mpu.data = Buffer.allocUnsafe(this.mpu.size).fill(0x00);

        while (this.mpuFrags[strIterator] !== undefined && this.mpuFrags[strIterator].size > 0) {
            if (i + this.mpuFrags[strIterator].size < this.mpu.size) {
                this.mpu.data = this.bufferCopy(this.mpu.data, i, this.mpuFrags[strIterator].data, 0, this.mpuFrags[strIterator].size);
            }
            else {
                ret = false;
                break;
            }

            i += this.mpuFrags[strIterator].size;
            strIterator = i.toString();
        }

        if (i !== this.mpu.size) {
            ret = false;
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
                return MPU_Fragment_Type.ftyp;
            }
            else if (boxName.compare(moof) === 0) {
                return MPU_Fragment_Type.moof;
            }
            else if (boxName.compare(mdat) === 0) {
                return MPU_Fragment_Type.mdat;
            }
        }
    }

    composeMPUFrags (mpuFrag) {
        //let i = 0;
        let ret = false;
        //let mpuFrags = this.mpuFrags;
        //let beginFrag = this.composedFragNum + 1;
        //let mpuFragCnt = mpuFrag.length;

        let mmpu = Buffer.from("mmpu");
        let mmpuLen = mmpu.length;
        let moov = Buffer.from("moov");
        let moovLen = moov.length;

        //for (i=beginFrag; i<mpuFragCnt; i++) {
        if (mpuFrag.type === MPU_Fragment_Type.ftyp) {
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

            this.setMPUMetadata(mpuFrag);
        }
        else if (mpuFrag.type === MPU_Fragment_Type.moof) {
            this.setMoofMetadata(mpuFrag);
        }
        else if (mpuFrag.type === MPU_Fragment_Type.mdat) {
            // 시작 포인트가 다른것 같다. 윈도우에서 위치를 로그찍어서 비교해보자.
            let iterator = 0;
            let mfu = new MFU();
            mfu.mfu_num = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.mfu_num: "+mfu.mfu_num);
            iterator += 11;
            mfu.offset = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.offset: "+mfu.offset);
            iterator += 4;
            mfu.length = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            console.log("mfu.length: "+mfu.length);
            
            mpuFrag.typeInfo = mfu;
            this.setMFU(mpuFrag);
        }
        else {
            // Error.
            ret = false;
            //break;
        }
        //}

        return ret;
    }

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
                                    mpuFrag.video_trak_id = trakId;
                                }
                                else if(boxName.compare(hint) === 0) {
                                    mpuFrag.hint_trak_id = trakId;
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
        moov_pos = mpuFrag.data.includes(mmth);
        //mpu.asset_type = (Buffer.from(mpu.data, moov_pos, 1) & 0x40) >> 6;/**/
        this.mpu.asset_type = Buffer.allocUnsafe(1).fill(0x00);
        this.mpu.asset_type = this.bufferCopy(this.mpu.asset_type, 0, mpuFrag.data, moov_pos, 1);
        this.mpu.asset_type &= 0x40;
        this.mpu.asset_type >>= 6;
        // End of GetTrackIdinRebuilder
    }

    setMoofMetadata (mpuFrag) {
        if (this.moofMetadata.first_moof_flag) {
            console.log("aaaaa");
            this.moofMetadata.first_moof_flag = 0;
        }
        else {
            this.mpu.descriptor = this.moofMetadata.mdat_offset + this.moofMetadata.mdat_size;
        }

        //this.bufferCopy(this.mpu.data, this.mpu.descriptor, mpuFrag.data, 0, mpuFrag.size);
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
            }
        }

        //mmte_khu1_GetSampleOffsetinRebuilder
        this.getSampleOffset(mpuFrag);

        //this.bufferCopy(this.mpu.data, this.mpu.hint_sample_offset, mpuFrag.data, 0, hintSampleSize);
        this.setMPUFragPos(this.mpu.hint_sample_offset, mpuFrag.data, 0, hintSampleSize);
        //this.bufferCopy(this.mpu.data, this.mpu.video_sample_offset, mpuFrag.data, hintSampleSize, mpuFrag.hint_sample_offset);
        this.setMPUFragPos(this.mpu.video_sample_offset, mpuFrag.data, hintSampleSize, mpuFrag.hint_sample_offset);

        //memcpy(&(hdlr->mpu[hdlr->hint_sample_offset]), mpuf->data, hssize);
	    //memcpy(&(hdlr->mpu[hdlr->video_sample_offset]), mpuf->data+hssize, mpuf->data_size-hssize);
    }


    getSampleOffset (mpuFrag) {
        console.log("---getSampleOffset---");
        console.log("this.mpu.descriptor: " + this.mpu.descriptor);
        console.log("this.mpu.moof_offset: "+this.mpu.moof_offset);
        let iterator = 0;

        let boxName = null;
        let msbSize = 0;
        let traf = Buffer.from("traf");
        let trafLen = traf.length;
        let tfhd = Buffer.from("tfhd");
        let tfhdLen = tfhd.length;
        let trun = Buffer.from("trun");
        let trunLen = trun.length;

        if (mpuFrag.typeInfo.video_sample_count === 0) {
            let moofboxsize = this.getIntTo4ByteBuffer(mpuFrag.data, iterator) - 8;
            iterator += 8;

            console.log("moofboxsize: " + moofboxsize);

            while (moofboxsize > 0) {
                msbSize = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                iterator += 4;

                console.log("msbSize: " + msbSize);

                boxName = this.get4ByteBuffer(mpuFrag.data, iterator);
                iterator += 4;
                if (boxName.compare(traf) === 0) {
                    let trafSize = msbSize;
                    let tsbPtr = iterator;
                    let tSize = trafSize - 8;
                    let tfhdFlags = false;
                    let trafId = null;
                    let baseDataOffset = 0;
                    let tsbSize = 0;

                    while (tSize > 0) {
                        tsbSize = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                        iterator += 4;

                        boxName = this.get4ByteBuffer(mpuFrag.data, iterator);
                        iterator += 4;

                        if (boxName.compare(tfhd) === 0) {
                            iterator += 4;

                            let tfhdPrt = iterator;
                            tfhdFlags = this.getIntTo3ByteBuffer(mpuFrag.data, iterator+1);
                            iterator += 4;
                            trafId = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                            iterator += 4;

                            if (tfhdFlags & 0x01) {
                                baseDataOffset = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                                iterator += 4;
                                baseDataOffset = baseDataOffset << 32 | this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
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
                        tsbSize = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                        iterator += 4;

                        boxName = this.get4ByteBuffer(mpuFrag.data, iterator);
                        iterator += 4;
                        
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

                        flags = this.getIntTo3ByteBuffer(mpuFrag.data, iterator + 1);
                        iterator += 4;
                        sample_count = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                        iterator += 4;

                        if (flags & 0x01) {
                            data_offset = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
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

                        mpuFrag.video_sample_count = sample_count;
                        mpuFrag.video_sample_size_offset = sizeValuePtr;// - mpu;
                        mpuFrag.video_sample_size_seek_num = skipNum;
                        mpuFrag.video_sample_offset = baseDataOffset + data_offset;
                    }
                    else if(trafId === mpu.hint_trak_id) {
                        iterator += 8;
                        let data_offset = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
                        iterator += 4;

                        this.mpu.hint_sample_offset = baseDataOffset + data_offset;
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

            iterator = this.mpu.video_sample_size_offset;
            video_sample_size = this.getIntTo4ByteBuffer(mpuFrag.data, iterator);
            iterator += 4;

            hint_sample_size = 4;
            if (this.mpu.asset_type === AssetType.timed) {
                hint_sample_size += 26;
            }
            else {
                hint_sample_size += 2;
            }

            this.mpu.video_sample_size_offset += this.mpu.video_sample_size_seek_num;
            this.mpu.video_sample_offset += video_sample_size;
            this.mpu.hint_sample_offset += hint_sample_size;
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