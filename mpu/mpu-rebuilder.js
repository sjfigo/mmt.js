var MPU = require("./MPU/mmt-structure/mpu.js");
var MPUFragment = require("./MPU/mmt-structure/mpu-fragment.js");
var AssetID = require("./MPU/mmt-structure/asset-id.js");

class MPURebuilder {
    constructor (cbPostMPU) {
        this.mpu = new MPU();
        this.mpuFrag = null;
        this.composedFragNum = 0;
        this.postMPU = cbPostMPU;
    }

    /**
     * Set received MPU fragment data
     * @param {* Buffer} data
     */
    set mpuFrag (data) {
        let mpuFrag = null;
        let mpuFragData = new Buffer(data);
        let size = mpuFragData.length;
        let type = this.getMPUFragType (mpuFragData, size);
        mpuFrag = new MPUFragment(type, mpuFragData, size);

        if (this.composeMPUFrags()) {
            this.postMPU(this.mpu);
        }
    }

    /**
     * Return 4 bytes Buffer object read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    get4ByteBuffer (buf, offset) {
        const len = 4;
        let resultBuffer = Buffer.allocUnsafe(4).fill(0x00);
        buf.copy(resultBuffer, 0, offset, len);
        return resultBuffer;
    }

    /**
     * Return integer read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo4ByteBuffer (buf, offset) {
        return (buf.readUInt8(offset + 0) & 0xFF) << 24 | (buf.readUInt8(offset + 1) & 0xFF) << 16 | (buf.readUInt8(offset + 2) & 0xFF) << 8 | (buf.readUInt8(offset + 3) & 0xFF);
    }

    /**
     * Return integer read 3 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo3ByteBuffer (buf, offset) {
        return (buf.readUInt8(offset + 0) & 0xFF) << 16 | (buf.readUInt8(offset + 1) & 0xFF) << 8 | (buf.readUInt8(offset + 2) & 0xFF);
    }


    bufferCopy (target, targetPosition, data, dataPosition, dataLength) {
        let targetLength = target.length;
        let size = targetPosition + dataLength;
        let resultBuffer = null;

        if (targetLength > size) {
            resultBuffer = Buffer.allocUnsafe(targetLength).fill(0x00);
            target.copy(resultBuffer, 0, 0, targetLength);
            console.log("1-1: " + resultBuffer.toString());
            data.copy(resultBuffer, targetPosition, dataPosition, dataPosition + dataLength);
            console.log("1-2: " + resultBuffer.toString());
            return resultBuffer;
        }
        else {
            let resultSize = size;
            resultBuffer = Buffer.allocUnsafe(resultSize).fill(0x00);
            target.copy(resultBuffer, 0, 0, targetLength);
            console.log("2-1: " + resultBuffer.toString());
            data.copy(resultBuffer, targetPosition, dataPosition, dataPosition + dataLength);
            console.log("2-2: " + resultBuffer.toString());
        
            return resultBuffer;
        }
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
            if (boxName.compare(ftyp, ftypLen) === 0) {
                return MPU_Fragment_Type.ftyp;
            }
            else if (boxName.compare(moof, moofLen) === 0) {
                return MPU_Fragment_Type.moof;
            }
            else if (boxName.compare(mdat, mdatLen) === 0) {
                return MPU_Fragment_Type.mdat;
            }
        }
    }

    composeMPUFrags () {
        let i = 0;
        let mpuFrags = this.mpuFrags;
        let beginFrag = this.composedFragNum + 1;
        let mpuFragCnt = this.mpuFrags.length;

        let mmpu = Buffer.from("mmpu");
        let mmpuLen = mmpu.length;
        let moov = Buffer.from("moov");
        let moovLen = moov.length;

        for (i=beginFrag; i<mpuFragCnt; i++) {
            if (mpuFrags[i].type === MPU_Fragment_Type.ftyp) {
                let iterator = 0;
                let boxName = this.get4ByteBuffer(mpuFrags[i].data, iterator + 4);

                let mpuMeta = new MPUMetadata();

                while(boxName.compare(mmpu, mmpuLen) !== 0) {
                    iterator += this.getIntTo4ByteBuffer(mpuFrags[i].data, iterator);
                    boxName = this.get4ByteBuffer(mpuFrags[i].data, iterator + 4);
                }
                mpuMeta.mpu_num = this.getIntTo4ByteBuffer(mpuFrags[i].data, iterator +13);

                boxName = this.get4ByteBuffer(mpuFrags[i].data, iterator + 4);
                while(boxName.compare(moov, moovLen) !== 0) {
                    iterator += this.getIntTo4ByteBuffer(mpuFrag[i].data, iterator);
                    boxName = this.get4ByteBuffer(mpuFrags[i].data, iterator + 4);
                }
                mpuMeta.moov_offset = iterator;
                mpuFrag[i].typeInfo = mpuMeta;

                this.setMPUMetadata(mpuFrags[i]);
            }
            else if (mpuFrags[i].type === MPU_Fragment_Type.moof) {
                this.setMoofMetadata(mpuFrags[i]);
            }
            else if (mpuFrags[i].type === MPU_Fragment_Type.mdat) {
                let iterator = 0;
                let mfu = new mfu();
                mfu.mfu_num = this.getIntTo4ByteBuffer(mpuFrags[i].data, iterator);
                iterator += 11;
                mfu.offset = this.getIntTo4ByteBuffer(mpuFrags[i].data, iterator);
                iterator += 4;
                mfu.length = this.getIntTo4ByteBuffer(mpuFrags[i].data, iterator);
                
                mpuFrags[i].typeInfo = mfu;
                this.setMFU(mpuFrags[i]);
            }
            else {
                // Error.
                break;
            }
        }
    }

    setMPUMetadata (mpumeta) {
        let mpu = this.mpu;
        let moo_size = 0;
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

        /*if (mpu.size < mpu.position + mpumeta.size) {
            let tempLen = mpu.size - mpu.position + mpumeta.size;
            let temp = Buffer.alloc(tempLen);
            temp.fill(0);
            mpu.size += tempLen + mpumeta.size;
            mpu.data = Buffer.concat([mpu.data, temp, mpumeta.data],  mpu.size);
        }
        else {
            mpu.data.from(mpumeta.data, mpu.position, mpumeta.size);
        }*/

        this.bufferCopy(mpu.data, mpu.position, mpumeta.data, 0, mpumeta.size);

        mpu.position += mpumeta.size;
        mpu.mpu_meta_flag = true;

        // Begin of GetTrackIdinRebuilder
        moov_size = this.getIntTo4ByteBuffer(mpu.data, mpu.moov_offset);
        moov_pos = mpu.moov_offset + 8;

        while (moov_pos < moov_size) {
            boxSize = this.getIntTo4ByteBuffer(mpu.data, moov_pos);
            moov_pos += 4;
            boxName = this.get4ByteBuffer(mpu.data, moov_pos);
            moov_pos += 4;
            if (boxSize.compare(trak, trakLen) === 0) {
                let trakId = null;
                let trakSize = boxSize;
                let trakSubBoxOffset = 0;

                moov_pos += 4;
                trakSubBoxOffset = moov_pos;
                trakSize -=8;

                while (trakSize > 0) {
                    let tsbSize = 0;
                    tsbSize = this.getIntTo4ByteBuffer(mpu.data, moov_pos);
                    moov_pos += 4;
                    boxName = this.get4ByteBuffer(mpu.data, moov_pos);
                    moov_pos += 4;
                    if (boxName.compare(tkhd, tkhdLen) === 0) {
                        //let version = Buffer.from(mpu.data, moov_pos, 1) & 0xFF;/**/
                        let version = new Buffer();
                        this.bufferCopy(version, 0, mpu.data, moov_pos, 1);
                        version &= 0xFF;

                        if (version === 1) {
                            moov_pos += 28;
                        }
                        else {
                            moov_pos += 12;
                        }

                        trakId = this.getIntTo4ByteBuffer(mpu.data, moov_pos);
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
                    let tsbSize = this.getIntTo4ByteBuffer(mpu.data, moov_pos);
                    moov_pos += 4;
                    boxName = this.get4ByteBuffer(mpd.data, moov_pos);
                    moov_pos += 4;
                    if (boxName.compare(mdia, mdiaLen) === 0) {
                        let mdiaSize = tsbSize - 8;

                        while (mdiaSize > 0) {
                            let msbSize = this.getIntTo4ByteBuffer(mpu.data, moov_pos);
                            moov_pos += 4;
                            
                            if(boxName.compare(hdlr, hdlrLen) === 0) {
                                moov_pos += 12;
                                boxName = this.get4ByteBuffer(mpd.data, moov_pos);
                                moov_pos += 4;
                                if (boxName.compare(vide, videLen) === 0) {
                                    this.mpu.video_trak_id = trakId;
                                }
                                else if(boxName.compare(hint, hintLen) === 0) {
                                    this.mpu.hint_trak_id = trakId;
                                }
                                trakSubBoxOffset -= 4;
                                break;
                            }
                            moov_pos += (msbSize - 4);
                            mdiaSize -= msbSize;
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
        moov_pos = mpu.data.includes(mmth);
        //mpu.asset_type = (Buffer.from(mpu.data, moov_pos, 1) & 0x40) >> 6;/**/
        mpu.asset_type = new Buffer();
        this.bufferCopy(mpu.asset_type, 0, mpu.data, moov_pos, 1);
        mpu.asset_type &= 0x40;
        mpu.asset_type >>= 6;
        // End of GetTrackIdinRebuilder
    }

    setMoofMetadata (moofMeta) {
        let mpu = this.mpu;
        if (moofMeta.typeInfo.first_moof_flag) {
            moofMeta.typeInfo.first_moof_flag = 0;
        }
        else {
            mpu.position = moofMeta.typeInfo.mdat_offset + moofMeta.typeInfo.mdat_size;
        }

        /*if (mpu.size < mpu.position + moofMeta.size) {
            let tempLen = mpu.size - mpu.position + moofMeta.size;
            let temp = Buffer.alloc(tempLen);
            mpu.size += tempLen + moofMeta.size;
            mpu.data = Buffer.concat([mpu.data, temp, moofMeta.data],  mpu.size);
        }
        else {
            mpu.data.from(moofMeta.data, mpu.position, moofMeta.size);
        }*/

        this.bufferCopy(mpu.data, mpu.position, moofMeta.data, 0, moofMeta.size);

        moofMeta.moof_offset = mpu.position;
        mpu.position += moofMeta.size;
        moofMeta.typeInfo.mdat_offset = mpu.position - 8;
        moofMeta.typeInfo.mdat_size = this.getIntTo4ByteBuffer(mpu.data, moofMeta.typeInfo.mdat_offset);
        mpu.video_sample_count = 0;
    }

    setMFU (mfu) {
        let hintSampleSize = 4;

        if (mpu.asset_type === 1) {
            hintSampleSize += 26;
        }
        else {
            hintSampleSize += 2;
        }

        if (mfu.typeInfo.mfu_num !== mfu.typeInfo.next_mfu_num) {
            while (mfu.typeInfo.mfu_num > mfu.typeInfo.next_mfu_num) {
                //mmte_khu1_GetSampleOffsetinRebuilder
                this.getSampleOffset(mfu);
            }
        }

        //mmte_khu1_GetSampleOffsetinRebuilder
        this.getSampleOffset(mfu);

        this.bufferCopy(mpu.data, mpu.hint_sample_offset, mfu.data, 0, hintSampleSize);
        this.bufferCopy(mpu.data, mpu.video_sample_offset, mfu.data, hintSampleSize, mfu.hint_sample_offset);

        //memcpy(&(hdlr->mpu[hdlr->hint_sample_offset]), mpuf->data, hssize);
	    //memcpy(&(hdlr->mpu[hdlr->video_sample_offset]), mpuf->data+hssize, mpuf->data_size-hssize);
    }


    getSampleOffset (mfu) {
        let mpu = this.mpu;
        let iterator = mpu.moof_offset;

        let msbSize = 0;
        let traf = Buffer.from("traf");
        let trafLen = traf.length;
        let tfhd = Buffer.from("tfhd");
        let tfhdLen = tfhd.length;
        let trun = Buffer.from("trun");
        let trunLen = trun.length;

        if (mfu.typeInfo.video_sample_count === 0) {
            let moofboxsize = this.getIntTo4ByteBuffer(mpu.data, iterator) - 8;
            iterator += 8;

            while (moofboxsize > 0) {
                msbSize = this.getIntTo4ByteBuffer(mpu.data, iterator);
                iterator += 4;

                boxName = this.get4ByteBuffer(mpu.data, iterator);
                iterator += 4;
                if (boxName.compare(traf, trafLen) === 0) {
                    let trafSize = msbSize;
                    let tsbPtr = iterator;
                    let tSize = trafSize - 8;
                    let tfhdFlags = false;
                    let trafId = null;
                    let baseDataOffset = 0;
                    let tsbSize = 0;

                    while (tSize > 0) {
                        tsbSize = this.getIntTo4ByteBuffer(mpu.data, iterator);
                        iterator += 4;

                        boxName = this.get4ByteBuffer(mpu.data, iterator);
                        iterator += 4;

                        if (boxName.compare(tfhd, tfhdLen) === 0) {
                            iterator += 4;

                            let tfhdPrt = iterator;
                            tfhdFlags = this.getIntTo3ByteBuffer(mpu.data, iterator+1);
                            iterator += 4;
                            trafId = this.getIntTo4ByteBuffer(mpu.data, iterator);
                            iterator += 4;

                            if (tfhdFlags & 0x01) {
                                baseDataOffset = this.getIntTo4ByteBuffer(mpu.data, iterator);
                                iterator += 4;
                                baseDataOffset = baseDataOffset << 32 | this.getIntTo4ByteBuffer(mpu.data, iterator);
                                iterator += 4;
                            }
                            else {
                                baseDataOffset = mpu.moof_offset;
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
                        tsbSize = this.getIntTo4ByteBuffer(mpu.data, iterator);
                        iterator += 4;

                        boxName = this.get4ByteBuffer(mpu.data, iterator);
                        iterator += 4;
                        
                        if (boxName.compare(trun, trunLen) === 0) {
                            iterator += 4;
                            break;
                        }
                        iterator += (tsbSize - 4);
                        tSize -= tsbSize;
                    }

                    if (trafId === mpu.video_trak_id) {
                        let flags = null;
                        let sample_count = 0;
                        let data_offset = 0;
                        let skipNum = 0;
                        let sizeValuePtr = 0;

                        flags = this.getIntTo3ByteBuffer(mpu.data, iterator + 1);
                        iterator += 4;
                        sample_count = this.getIntTo4ByteBuffer(mpu.data, iterator);
                        iterator += 4;

                        if (flags & 0x01) {
                            data_offset = this.getIntTo4ByteBuffer(mpu.data, iterator);
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

                        mfu.video_sample_count = sample_count;
                        mfu.video_sample_size_offset = sizeValuePtr;// - mpu;
                        mfu.video_sample_size_seek_num = skipNum;
                        mfu.video_sample_offset = baseDataOffset + data_offset;
                    }
                    else if(trafId === mpu.hint_trak_id) {
                        iterator += 8;
                        let data_offset = this.getIntTo4ByteBuffer(mpu.data, iterator);
                        iterator += 4;

                        mpu.hint_sample_offset = baseDataOffset + data_offset;
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

            iterator = mpu.video_sample_size_offset;
            video_sample_size = this.getIntTo4ByteBuffer(mpu.data, iterator);
            iterator += 4;

            hint_sample_size = 4;
            if (mpu.asset_type === AssetType.timed) {
                hint_sample_size += 26;
            }
            else {
                hint_sample_size += 2;
            }

            mpu.video_sample_size_offset += mpu.video_sample_size_seek_num;
            mpu.video_sample_offset += video_sample_size;
            mpu.hint_sample_offset += hint_sample_size;
        }
    }
}
module.exports = MPURebuilder;

var postRebuild = function (mpuData) {

};
var mpuRebuilder = new MPURebuilder(postRebuild);
var FileController = require("../Client/util/file-controller.js");
var fileController = new FileController();
var mpu_path = "/Users/daehee/Git/MMT-WebPlayer/mpu/MPU/000.mp4";
var mpuData = fileController.readBinFile(mpu_path);
mpuRebuilder.mpuFrag = mpuData;