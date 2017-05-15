var MPU = require("./mmt-structure/mpu.js");
var MPUFragment = require("./mmt-structure/mpu-fragment.js");
var AssetID = require("./mmt-structure/asset-id.js");

class MPUDissolver {
    /**
     * 
     * @param {*arraybuffer} mpu 
     * @param {*integer} size 
     */
    constructor (mpuData, size) {
        if (mpuData === null || mpuData === undefined || size == null || size === undefined) {
            return null;
        }
        this.mpu = new MPU(new Buffer(mpuData), size);
        this.mpuFrags = null;
        this.assetId = null;

        this.parseAssetInfo();
    }

    set mpuData (data) {
        let mpuData = new Buffer(data);
        if (this.mpu === undefined || this.mpu === null) {
            this.mpu = new MPU();
        }
        this.mpu.data = mpuData;
        this.mpu.dataSize = mpuData.length;
    }

    get mpuFragments () {
        if (this.mpu.data === null) {
            return null;
        }
        else {
            if (this.mpuFrags === null) {
                this.mpuFrags = this.getMPUFragments();
            }
            return this.mpuFrags;
        }
    }

    get assetID () {
        return this.assetId;
    }

    parseAssetInfo () {
        let mpu = this.mpu;
        let mpuDescriptor = 0;
        let mpuBeginDsc = 0;
        let boxName = null;
        let boxSize = 0;
        let mmpu = Buffer.from("mmpu");
        let mmpuLen = mmpu.length;

        while(mpuDescriptor < mpu.size) {
            mpuBeginDsc = mpuDescriptor;
            boxSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
            mpuDescriptor += 4;
            boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
            mpuDescriptor += 4;

            if (boxName.compare(mmpu, mmpuLen) === 0) {
                let assetID = new AssetID();
                
                mpuDescriptor += 9;
                
                assetID.scheme = getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                mpuDescriptor += 4;
                
                assetID.length = getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                mpuDescriptor += 4;

                assetID.value = Buffer.from(mpu.data, mpuDescriptor, assetID.length);
                mpuDescriptor += assetID.length;

                this.assetId = assetID;
                break;
            }
            mpuDescriptor = mpuBeginDsc + boxSize;
        }

        if (this.assetId === null) {
            return false;
        }
        else {
            return true;
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

    getMPUFragments () {
        let mpu = this.mpu;
        let mpuDataSize = this.mpu.dataSize;
        let mpuDescriptor = this.mpu.descriptor;

        let boxSize = 0;
        let boxName = null;

        let mdat = Buffer.from("mdat");
        let mdatLen = mdat.length;
        let ftyp = Buffer.from("ftyp");
        let ftypLen = ftyp.length;
        let moof = Buffer.from("moof");
        let moofLen = Buffer.length;
        
        let mpuFragArr = [];
        let mpuFragCnt = 0;
        let mpuFrag = null;

        while(mpuDescriptor < mpuDataSize) {
            // mmte_khu1_GetNextMPUFragment begin
            boxSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
            mpuDescriptor += 4;
            boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
            mpuDescriptor += 4;

            if (boxName.compare(mdat, mdatLen) === 0) {
                mpuFrag = this.getMFU(mpu.data, mpuDescriptor);
            }
            else if (boxName.compare(ftyp, ftypLen) === 0) {
                mpuFrag = this.getMPUMeta(mpu.data, mpuDescriptor);
            }
            else if (boxName.compare(moof, moofLen) === 0) {
                mpuFrag = this.getMovieFragMeta(mpu.data, mpuDescriptor, boxSize);
            }
            else {
                break;
            }
            // end of mmte_khu1_GetNextMPUFragment

            if (mpuFrag === null){
                break;
            }

            mpuFragArr[mpuFragCnt] = mpuFrag;
            mpuFragCnt++;
        }

        return mpuFragArr;
    } 

    /**
     * mdat box parsing
     * @param {*MPU} mpu
     * @param {*integer} mpuDescriptor
     */ 
    getMPUMeta (mpu, mpuDescriptor) {
        let mpuFrag = new MPUFragment();
        let beginPos = mpuDescriptor;

        let boxSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
        let boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor + 4);
        
        let moov = Buffer.from("moov");
        let moovLen = moov.length;
        let moof = Buffer.from("moof");
        let moofLen = moof.length;

        let mpuMetaSize = 0;

        mpuFrag.type = MPU_Fragment_Type.ftyp;

        while (boxName.compare(moof, moofLen) !== 0) {
            if (boxName.compare(moov, moovLen) === 0) {
                mpu.moov_offset = mpuDescriptor;
            }

            mpuDescriptor += boxSize;
            mpuMetaSize += boxSize;

            boxSize = (mpu.data[mpuDescriptor + 0] & 0xFF) << 24 | (mpu.data[mpuDescriptor + 1] & 0xFF) << 16 | (mpu.data[mpuDescriptor + 2] & 0xFF) << 8 | (mpu.data[mpuDescriptor + 3] & 0xFF);;
            boxName = Buffer.from(mpu.data, iterator + boxSizeLen, boxNameLen);
        }

        mpuFrag.size = mpuMetaSize;
        mpuFrag.data = Buffer.from(mpu.data, mpuDescriptor, mpuFrag.size);

        return mpuFrag;
    }

    /**
     * ftyp box parsing
     * @param {*MPU} mpu
     * @param {*integer} mpuDescriptor
     */ 
    getMovieFragMeta (mpu, mpuDescriptor, boxSize) {
        let mpuFrag = new MPUFragment();
        let mdatHeaderLen = 8;

        mpuFrag.type = MPU_Fragment_Type.moof;
        mpuFrag.size = boxSize + mdatHeaderLen;
        mpuFrag.data = Buffer.from(mpu.data, mpuDescriptor, mpuFrag.size);
    }

    /**
     * MFU parsing
     * @param {*MPU} mpu
     * @param {*integer} mpuDescriptor
     */ 
    static getMFU (mpu, mpuDescriptor) {
        let mpuFrag = new MPUFragment();

        let boxSize = 0;
        let hintSampleSize = 0;
        let videoSampleSize = 0;
        let mpuFragData = [];

        if (mpu.video_trak_id === null && mpu.hint_trak_id === null) {
            this.getTrackID();
        }
        this.getSampleOffset();

        mpu.descriptor = mpu.video_sample_size_offset;
        videoSampleSize = this.getIntTo4ByteBuffer(mpu.data, mpu.descriptor);
        hintSampleSize = 4;

        if (mpu.asset_type === AssetType.timed) {
            hintSampleSize += 26;
        }
        else {
            hintSampleSize == 2;
        }

        mpuFrag.size = hintSampleSize + videoSampleSize;
        mpuFragData[0] = Buffer.from(mpu.data, mpu.hint_sample_offset, hintSampleSize);
        mpuFragData[1] = Buffer.from(mpu.data, mpu.video_sample_offset, videoSampleSize);
        mpuFrag.data = Buffer.concat(mpuFragData, mpuFrag.size);
        mpuFrag.type = MPU_Fragment_Type.mdat;

        mpu.video_sample_count --;
        if (mpu.video_sample_count === 0) {
            mpu.descriptor += boxSize;
        }
    }

    getTrackID () {
        let mpu = this.mpu;
        let mpuDescriptor = 0;

        let moovSize = 0;

        let boxSize = 0;
        let boxName = null;
        
        let trak = Buffer.from("trak");
        let trakLen = trak.length;
        let tkhd = Buffer.from("tkhd");
        let tkhdLen = tkhd.length;
        let mdia = Buffer.from("mdia");
        let mdiaLen = mdia.length;
        let mdhd = Buffer.from("mdhd");
        let mdhdLen = mdhd.length;
        let hdlr = Buffer.from("hdlr");
        let hdlrLen = hdlr.length;
        let vide = Buffer.from("vide");
        let videLen = vide.length;
        let hint = Buffer.from("hint");
        let hintLen = hint.length;

        mpuDescriptor = mpu.moov_offset;
        moovSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor) - 8;
        mpuDescriptor = mpu.moov_offset + 8;

        while (moovSize > 0) {
            boxSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
            mpuDescriptor += 4;
            
            boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
            mpuDescriptor += 4;
            if (boxName.compare(trak, trakLen) === 0) {
                let trakid = null;
                let trakSize = boxSize - 8;
                let trakSubBoxOffset = mpuDescriptor;

                while (trakSize > 0) {
                    let tsbSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                    mpuDescriptor += 4;
                    boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                    mpuDescriptor += 4;

                    if (boxName.compare(tkhd, tkhdLen) === 0) {
                        let version = 0;
                        let strVer = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                        mpuDescriptor += 4;
                        version = strVer[0] & 0xFF;
                        if (version === 1) {
                            descriptor += 16;
                        }
                        else {
                            descriptor += 8;
                        }
                        trakid = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);

                        break;
                    }
                    else {
                        mpuDescriptor += (tsbSize - 8)
                    }
                    trakSize -= tsbSize;
                }

                trakSize = boxSize - 8;
                mpuDescriptor = trakSubBoxOffset;

                while (trakSize > 0) {
                    let tsbSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                    mpuDescriptor += 4;
                    boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                    mpuDescriptor += 4;

                    if (boxName.compare(mdia, mdiaLen) === 0) {
                        let mdiaSize = tsbSize - 8;

                        while (mdiaSize > 0) {
                            let msbSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                            mpuDescriptor += 4;
                            
                            boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                            mpuDescriptor += 4;
                            if (boxName.compare(mdhd, mdhdLen) === 0) {
                                let mdhdOffset = mpuDescriptor;
                                let temp = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                                mpuDescriptor += 4;
                                if (temp.compare(0x01, 1) === 0) {
                                    mpuDescriptor += 16;
                                }
                                else {
                                    mpuDescriptor += 8;
                                }

                                let timescale = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                                mpuDescriptor += 4;
                                
                                mpuDescriptor = mdhdOffset;
                            }
                            else if (boxName.compare(hdlr, hdlrLen) === 0) {
                                mpuDescriptor += 8;
                                boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                                if (boxName.compare(vide, videLen) === 0) {
                                    mpu.video_trak_id = trakid;
                                }
                                else if (boxName.compare(hint, hintLen) === 0) {
                                    mpu.hint_trak_id = trakid;
                                }
                                break;
                            }

                            mpuDescriptor -= (msbSize - 8);
                            mdiaSize -= msbSize;
                        }

                        break;
                    }
                    else {
                        mpuDescriptor -= (tsbSize - 8);
                    }
                    trakSize -= tsbSize;
                }
                mpuDescriptor = trakSubBoxOffset;
            }
            mpuDescriptor += (boxSize - 8);
            moovSize -= boxSize;
        }
    }

    getSampleOffset () {
        let mpu = this.mpu;
        let mpuDescriptor = 0;

        let boxName = null;
        let traf = Buffer.from("traf");
        let trafLen = 4;
        let tfhd = Buffer.from("tfhd");
        let tfhdLen = 4;
        let trun = Buffer.from("trun");
        let trunLen = 4;
        let tfdt = Buffer.from("tfdt");
        let tfdtLen = 4;
        
        if (mpu.video_sample_count === 0) {
            let moofBoxSize = 0;
            mpuDescriptor = mpu.moof_offset;
            moofBoxSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor) - 8;
            mpuDescriptor += 8;

            while (moofBoxSize > 0) {
                let msbSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                if (boxName.compare(traf, trafLen) === 0) {
                    let trafSize = 0;
                    let tsbOffset = 0;
                    let tSize = 0;
                    let tfhdFlags = 0;
                    let trafId = 0;
                    let trunOffset = 0;
                    let baseDataOffset = 0;

                    trafSize = msbSize;
                    tsbOffset = mpuDescriptor;
                    tSize = trafSize - 8;

                    while (tSize > 0) {
                        let tsbSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                        mpuDescriptor += 4;
                        boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                        mpuDescriptor += 4;

                        if (boxName.compare(tfhd, tfhdLen) === 0) {
                            let tfhdOffset = mpuDescriptor;
                            let temp = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                            mpuDescriptor += 4;

                            tfhdFlags = (temp[1]&0xFF)<<16 | (temp[2]&0xFF)<<8 | (temp[3]&0xFF);
                            trafId = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                            mpuDescriptor += 4;
                            if (tfhdFlags & 0x01) {
                                baseDataOffset = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                                mpuDescriptor += 4;
                                temp = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                                mpuDescriptor += 4;
                                baseDataOffset = baseDataOffset<<32 | (temp[0]&0xFF)<<24 | (temp[1]&0xFF)<<16 | (temp[2]&0xFF)<<8 | (temp[3]&0xFF);
                            }
                            else {
                                baseDataOffset = mpu.moof_offset;
                            }
                            mpuDescriptor = tfhdOffset;
                            break;
                        }
                        mpuDescriptor += (tsbSize - 8);
                        tSize -= tsbSize;
                    }

                    mpuDescriptor = tsbOffset;
                    tSize = trafSize - 8;

                    while (tSize > 0) {
                        let tsbSize = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                        mpuDescriptor += 4;
                        boxName = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                        mpuDescriptor += 4;

                        if (boxName.compare(trun, trunLen) === 0) {
                            trunOffset = mpuDescriptor;
                        }
                        else if (boxName.compare(tfdt, tfdtLen) === 0) {
                            mpuDescriptor += 4;
                            mpu.decodingTime = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                            mpuDescriptor -= 8;
                        }

                        mpuDescriptor += (tsbSize - 8);
                        tSize -= tsbSize;
                    }

                    mpuDescriptor = trunOffset;
                    if(trafId === mpu.video_trak_id) {
                        let flags = 0;
                        let sample_count = 0;
                        let data_offset = 0;
                        let skipnum = 0;
                        let sizeValueOffset = 0;
                        
                        let temp = this.get4ByteBuffer(mpu.data, mpuDescriptor);
                        mpuDescriptor += 4;

                        flags = (temp[1]&0xFF)<<16 | (temp[2]&0xFF)<<8 | (temp[3]&0xFF);
                        
                        sample_count = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                        mpuDescriptor += 4;

                        if (flags & 0x01) {
                            data_offset = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                            mpuDescriptor += 4;
                        }
                        if (flags & 0x04) {
                            mpuDescriptor += 4;
                        }
                        skipnum = 0;

                        if (flags & 0x100) {
                            mpuDescriptor += 4;
                        }
                        if (flags & 0x200) {
                            sizeValueOffset = mpuDescriptor;
                            skipnum += 4;
                        }
                        if (flags & 0x400) {
                            skipnum += 4;
                        }
                        if (flags & 0x800) {
                            skipnum += 4;
                        }

                        mpu.video_sample_count = sample_count;
                        mpu.video_sample_size_offset = sizeValueOffset;
                        mpu.video_sample_size_seek_num = skipnum;
                        mpu.video_sample_offset = baseDataOffset + data_offset;
                    }

                    if (trafId === mpu.hint_trak_id) {
                        let data_offset = 0;
                        mpuDescriptor += 8;
                        data_offset = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
                        mpuDescriptor += 4;

                        mpu.hint_sample_offset = baseDataOffset + data_offset;
                    }
                    mpuDescriptor = tsbOffset;
                }
                mpuDescriptor += (msbSize - 8);
                moofBoxSize -= msbSize;
            }
        }
        else {
            let video_sample_size = 0;
            let hint_sample_size = 4;

            mpuDescriptor = mpu.video_sample_size_offset;
            video_sample_size = this.getIntTo4ByteBuffer(mpu.data, mpuDescriptor);
            mpuDescriptor += 4;
            
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
module.exports = MPUDissolver;

var FileController = require("../Client/util/file-controller.js");
var fileController = new FileController();
var mpu_path = "/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/000.mp4";
var mpuData = fileController.readBinFile(mpu_path);
if (mpuData === null) {
    console.log("NULL");
}
var dissolver = new MPUDissolver ();//mpuData, mpuData.length);
dissolver.mpuData = mpuData;
var mpuFrags = dissolver.mpuFragments;