var MPU = require("./mmt-structure/mpu.js");
var MPUFragment = require("./mmt-structure/mpu-fragment.js");
var AssetID = require("./mmt-structure/asset-id.js");
var MPU_Fragment_Type = require("./mmt-structure/mpu-fragment-type.js");
var AssetType = require("./mmt-structure/asset-type.js");

class MPUDissolver {
    /**
     * 
     * @param {*arraybuffer} mpu 
     * @param {*integer} size 
     */
    constructor (mpuData, size) {
        //console.log("MPUDissolver - constructor: mpuData - " + mpuData);
        //console.log("MPUDissolver - constructor: size - " + size);
        if (mpuData === null || mpuData === undefined || size == null || size === undefined) {
            return null;
        }
        this.mpu = new MPU(new Buffer(mpuData), size);
        //console.log(this.mpu.mpuData.length);
        this.mpuFrags = null;
        this.assetId = null;
        this.mpu.asset_type = AssetType.timed;
        this.mpu.video_sample_size_offset = 0;

        this.parseAssetInfo();
    }

    set mpuData (data) {
        let mpuData = new Buffer(data);
        if (this.mpu === undefined || this.mpu === null) {
            this.mpu = new MPU();
        }
        this.mpu.data = mpuData;
        this.mpu.dataSize = mpuData.length;
        //console.log("set mpuData success. " + data);
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
        let mpuBeginDsc = 0;
        let boxName = null;
        let boxSize = 0;
        let mmpu = Buffer.from("mmpu");

        while(this.mpu.descriptor < this.mpu.size) {
            mpuBeginDsc = this.mpu.descriptor;
            boxSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
            this.mpu.descriptor += 4;
            boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor);
            this.mpu.descriptor += 4;

            if (boxName.compare(mmpu) === 0) {
                let assetID = new AssetID();
                
                this.mpu.descriptor += 9;
                
                assetID.scheme = getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                this.mpu.descriptor += 4;
                
                assetID.length = getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                this.mpu.descriptor += 4;

                assetID.value = Buffer.from(this.mpu.data, this.mpu.descriptor, assetID.length);
                this.mpu.descriptor += assetID.length;

                this.assetId = assetID;
                break;
            }
            this.mpu.descriptor = mpuBeginDsc + boxSize;
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
        let resultBuffer = Buffer.allocUnsafe(len).fill(0x00);
        let ret = buf.copy(resultBuffer, 0, offset, offset + len);
        /*console.log("get4ByteBuffer: ");
        console.log("ret: " + ret);
        console.log("offset: " + offset);
        console.log(resultBuffer.toString());
        console.log(resultBuffer.length);
        console.log("get4ByteBuffer - buf.legnth: "+buf.length+", offset: "+offset);*/
        return resultBuffer;
    }

    /**
     * Return integer read 4 bytes from {buf}
     * @param {* Buffer} buf 
     * @param {* Offset from Buffer[0]} offset 
     */
    getIntTo4ByteBuffer (buf, offset) {
        let result = (buf.readUInt8(offset + 0) & 0xFF) << 24 | (buf.readUInt8(offset + 1) & 0xFF) << 16 | (buf.readUInt8(offset + 2) & 0xFF) << 8 | (buf.readUInt8(offset + 3) & 0xFF);
        /*console.log("getIntTo4ByteBuffer: ");
        console.log(result);
        console.log("getIntTo4ByteBuffer - buf.legnth: "+buf.length+", offset: "+offset);*/
        return result;
    }

    bufferCopy (target, targetPosition, data, dataPosition, dataLength) {
        let targetLength = target.length;
        let size = targetPosition + dataLength;
        let resultBuffer = null;

        //console.log("bufferCopy - data.length: "+data.length+", dataPosition: "+dataPosition+", targetLength: "+targetLength+", size: "+size);
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

    getMPUFragments () {
        let boxSize = 0;
        let boxName = null;

        let mdat = Buffer.from("mdat");
        let ftyp = Buffer.from("ftyp");
        let moof = Buffer.from("moof");
        
        let mpuFragArr = [];
        let mpuFrag = null;

        while(this.mpu.descriptor < this.mpu.dataSize) {
            //console.log("1. mpu.data.length: " + this.mpu.data.length + ", this.mpu.descriptor: " + this.mpu.descriptor);

            boxSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
            boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
            
            if (boxName.compare(mdat) === 0) {
                mpuFrag = this.getMFU(boxSize);
                //console.log(mpuFragCnt+". length: "+mpuFrag.size+", type: mdat");
                if (mpuFrag === null){
                    break;
                }
    
                mpuFragArr.push(mpuFrag);

                mpuFragCnt++;
            }
            else if (boxName.compare(ftyp) === 0) {
                mpuFrag = this.getMPUMeta();
                //console.log(mpuFragCnt+". length: "+mpuFrag.size+", type: ftyp");
                if (mpuFrag === null){
                    break;
                }
    
                mpuFragArr.push(mpuFrag);

                mpuFragCnt++;
            }
            else if (boxName.compare(moof) === 0) {
                mpuFrag = this.getMovieFragMeta(boxSize);
                //console.log(mpuFragCnt+". length: "+mpuFrag.size+", type: moof");
                if (mpuFrag === null){
                    break;
                }
    
                mpuFragArr.push(mpuFrag);

                mpuFragCnt++;
            }
            else {
                console.log("not matched");
                break;
            }
        }

        return mpuFragArr;
    } 

    /**
     * ftyp box parsing
     */ 
    getMPUMeta () {
        let mpuFrag = new MPUFragment(); // ->MPUMetadata
        let beginPos = this.mpu.descriptor;

        //console.log("2. mpu.data.length: " + this.mpu.data.length + ", this.mpu.descriptor: " + this.mpu.descriptor);

        let boxSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
        let boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
        
        //console.log("boxNamd: " + boxName + ", boxSize: " + boxSize);
        //console.log(this.mpu.data);
        
        let moov = Buffer.from("moov");
        let moof = Buffer.from("moof");

        let mpuMetaSize = 0;

        mpuFrag.type = MPU_Fragment_Type.MPU_Metadata;

        while (boxName.compare(moof) !== 0) {
            if (boxName.compare(moov) === 0) {
                this.mpu.moov_offset = this.mpu.descriptor;
            }

            this.mpu.descriptor += boxSize;
            mpuMetaSize += boxSize;

            if (this.mpu.data.legnth <= this.mpu.descriptor + 8)
            {
                //console.log("mpuDesciptor is over mpu length");
                break;
            }
            //console.log("3. this.mpu.data.length: " + this.mpu.data.length + ", this.mpu.descriptor: " + this.mpu.descriptor);
            boxSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
            boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
        }

        mpuFrag.size = mpuMetaSize;
        mpuFrag.data = this.bufferCopy(mpuFrag.data, 0, this.mpu.data, beginPos, mpuFrag.size);

        //console.log("ftyp - mpuFrag.data below");
        //console.log(mpuFrag.data);
        //console.log(mpuFrag.data.length);

        //console.log("adf" + this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor+4));

        return mpuFrag;
    }

    /**
     * moof box parsing
     */ 
    getMovieFragMeta (boxSize) {
        let mpuFrag = new MPUFragment();
        let mdatHeaderLen = 8;

        mpuFrag.type = MPU_Fragment_Type.Movie_Fragment_Metadata;
        mpuFrag.size = boxSize + mdatHeaderLen;
        mpuFrag.data = this.bufferCopy(mpuFrag.data, 0, this.mpu.data, this.mpu.descriptor, mpuFrag.size);

        this.mpu.moof_offset = this.mpu.descriptor;
        this.mpu.descriptor += boxSize;

        //console.log("mpuFrag.data below");
        //console.log(mpuFrag.data);

        return mpuFrag;
    }

    /**
     * MFU parsing
     */ 
    getMFU (boxSize) {
        let mpuFrag = new MPUFragment();

        let beginPos = this.mpu.descriptor;
        let hintSampleSize = 0;
        let videoSampleSize = 0;
        let mpuFragData = [];

        //console.log("getMFU - this.mpu.descriptor: "+this.mpu.descriptor);

        if (this.mpu.video_trak_id === null && this.mpu.hint_trak_id === null) {
            this.getTrackID();
        }
        this.getSampleOffset();

        this.mpu.descriptor = this.mpu.video_sample_size_offset;
        videoSampleSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
        this.mpu.descriptor += 4;
        hintSampleSize = 4;

        if (this.mpu.asset_type === AssetType.timed) {
            hintSampleSize += 26;
        }
        else {
            hintSampleSize += 2;
        }
        //console.log("getMFU - hintSampleSize: "+hintSampleSize+", videoSampleSize: "+videoSampleSize);
        //console.log("getMFU - this.mpu.hint_sample_offset: "+this.mpu.hint_sample_offset+", this.mpu.video_sample_offset: "+this.mpu.video_sample_offset);

        mpuFrag.size = hintSampleSize + videoSampleSize;

        mpuFrag.data = Buffer.allocUnsafe(hintSampleSize + videoSampleSize).fill(0x00);
        mpuFrag.data = this.bufferCopy(mpuFrag.data, 0, this.mpu.data, this.mpu.hint_sample_offset, hintSampleSize);
        //console.log("buffercopy check1: "+mpuFrag.data.compare(this.mpu.data, this.mpu.hint_sample_offset, this.mpu.hint_sample_offset+hintSampleSize, 0, hintSampleSize));
        mpuFrag.data = this.bufferCopy(mpuFrag.data, hintSampleSize, this.mpu.data, this.mpu.video_sample_offset, videoSampleSize);
        //console.log("buffercopy check2: "+mpuFrag.data.compare(this.mpu.data, this.mpu.video_sample_offset, this.mpu.video_sample_offset+videoSampleSize, hintSampleSize, hintSampleSize+videoSampleSize));
        //let temp = this.get4ByteBuffer(mpuFrag.data, 4);
        //console.log("getMFU - type1: "+temp);
        //console.log("mdat size is " + mpuFrag.data.length);

        mpuFrag.type = MPU_Fragment_Type.MFU;
        //console.log("mpuFrag.type: "+mpuFrag.type);

        //console.log("video_sample_count: " + this.mpu.video_sample_count);
        this.mpu.video_sample_count --;
        if (this.mpu.video_sample_count === 0) {
            this.mpu.descriptor = beginPos + boxSize;
            //console.log("AAAAAAAA: "+this.mpu.descriptor+" beginPos: "+beginPos);
        }
        else {
            this.mpu.descriptor = beginPos;
        }

        return mpuFrag;
    }

    getTrackID () {
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

        //console.log("getTrackID - this.mpu.descriptor: "+this.mpu.descriptor);

        this.mpu.descriptor = this.mpu.moov_offset;
        moovSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor) - 8;
        this.mpu.descriptor = this.mpu.moov_offset + 8;

        while (moovSize > 0) {
            boxSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
            this.mpu.descriptor += 4;
            
            boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor);
            this.mpu.descriptor += 4;
            if (boxName.compare(trak) === 0) {
                let trakid = null;
                let trakSize = boxSize - 8;
                let trakSubBoxOffset = this.mpu.descriptor;

                while (trakSize > 0) {
                    let tsbSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                    this.mpu.descriptor += 4;
                    boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                    this.mpu.descriptor += 4;

                    if (boxName.compare(tkhd) === 0) {
                        let version = 0;
                        //let strVer = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                        
                        version = this.mpu.data.readUInt8(this.mpu.descriptor) & 0xFF;
                        this.mpu.descriptor += 4;
                        //console.log("version: "+version);
                        if (version === 1) {
                            this.mpu.descriptor += 16;
                        }
                        else {
                            this.mpu.descriptor += 8;
                        }
                        trakid = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);

                        break;
                    }
                    else {
                        this.mpu.descriptor += (tsbSize - 8)
                    }
                    trakSize -= tsbSize;
                }

                trakSize = boxSize - 8;
                this.mpu.descriptor = trakSubBoxOffset;

                while (trakSize > 0) {
                    let tsbSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                    this.mpu.descriptor += 4;
                    boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                    this.mpu.descriptor += 4;

                    if (boxName.compare(mdia) === 0) {
                        let mdiaSize = tsbSize - 8;

                        while (mdiaSize > 0) {
                            let msbSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                            this.mpu.descriptor += 4;
                            
                            boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                            this.mpu.descriptor += 4;
                            if (boxName.compare(mdhd) === 0) {
                                let mdhdOffset = this.mpu.descriptor;
                                let temp = this.mpu.data.readUInt8(this.mpu.descriptor) & 0xFF;
                                this.mpu.descriptor += 4;
                                if (temp === 1) {
                                    this.mpu.descriptor += 16;
                                }
                                else {
                                    this.mpu.descriptor += 8;
                                }
                                this.mpu.timescale = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);                                
                                this.mpu.descriptor = mdhdOffset;
                            }
                            else if (boxName.compare(hdlr) === 0) {
                                this.mpu.descriptor += 8;
                                boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                                this.mpu.descriptor += 4;
                                if (boxName.compare(vide) === 0) {
                                    this.mpu.video_trak_id = trakid;
                                    //console.log("this.mpu.video_trak_id:" + this.mpu.video_trak_id);
                                }
                                else if (boxName.compare(hint) === 0) {
                                    this.mpu.hint_trak_id = trakid;
                                }
                                break;
                            }

                            this.mpu.descriptor += (msbSize - 8);
                            mdiaSize -= msbSize;
                        }

                        break;
                    }
                    else {
                        this.mpu.descriptor += (tsbSize - 8);
                    }
                    trakSize -= tsbSize;
                }
                this.mpu.descriptor = trakSubBoxOffset;
            }
            this.mpu.descriptor += (boxSize - 8);
            moovSize -= boxSize;
        }
    }

    getSampleOffset () {
        let boxName = null;
        let traf = Buffer.from("traf");
        let trafLen = 4;
        let tfhd = Buffer.from("tfhd");
        let tfhdLen = 4;
        let trun = Buffer.from("trun");
        let trunLen = 4;
        let tfdt = Buffer.from("tfdt");
        let tfdtLen = 4;

        //console.log("getSampleOffset - this.mpu.descriptor: "+this.mpu.descriptor);
        
        if (this.mpu.video_sample_count === 0) {
            console.log("--if------video_sample_count === 0------------------------------");
            //console.log("this.mpu.video_sample_count: "+this.mpu.video_sample_count);
            let moofBoxSize = 0;
            this.mpu.descriptor = this.mpu.moof_offset;
            moofBoxSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor) - 8;
            boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
            //console.log("moofBoxSize: "+moofBoxSize+", box name: "+boxName);
            this.mpu.descriptor += 8;

            while (moofBoxSize > 0) {
                let msbSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
                //console.log("this.mpu.descriptor: "+this.mpu.descriptor+", msbSize: "+msbSize+", boxName: "+boxName);
                this.mpu.descriptor += 8;
                
                if (boxName.compare(traf) === 0) {
                    let trafSize = 0;
                    let tsbOffset = 0;
                    let tSize = 0;
                    let tfhdFlags = 0;
                    let trafId = 0;
                    let trunOffset = 0;
                    let baseDataOffset = 0;

                    trafSize = msbSize;
                    tsbOffset = this.mpu.descriptor;
                    tSize = trafSize - 8;

                    while (tSize > 0) {
                        let tsbSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                        boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
                        this.mpu.descriptor += 8;

                        if (boxName.compare(tfhd) === 0) {
                            let tfhdOffset = this.mpu.descriptor;
                            tfhdFlags = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor) &0x00FFFFFF;
                            trafId = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
                            //console.log("this.mpu.descriptor: "+this.mpu.descriptor+", tfhdFlags: "+tfhdFlags+", trafId: "+trafId);
                            this.mpu.descriptor += 8;
                            
                            if (tfhdFlags & 0x01) {
                                let offset1 = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                                //console.log("offset1: "+offset1);
                                let offset2 = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
                                //console.log("offset2: "+offset2);
                                this.mpu.descriptor += 8;
                                offset1 <<= 32;
                                //console.log("offset1: "+offset1);
                                baseDataOffset = offset1 | offset2;
                                //console.log("tfhd - 0x01: baseDataOffset: "+baseDataOffset);
                                //console.log("this.mpu.descriptor: "+ (this.mpu.descriptor-8));
                            }
                            else {
                                baseDataOffset = this.mpu.moof_offset;
                                //console.log("tfhd - !0x01: baseDataOffset: "+baseDataOffset);
                            }
                            this.mpu.descriptor = tfhdOffset;
                            break;
                        }
                        this.mpu.descriptor += (tsbSize - 8);
                        //console.log("tSize: "+tSize+", tsbSize: "+tsbSize);
                        tSize -= tsbSize;
                    }

                    this.mpu.descriptor = tsbOffset;
                    tSize = trafSize - 8;

                    while (tSize > 0) {
                        let tsbSize = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                        boxName = this.get4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
                        this.mpu.descriptor += 8;

                        if (boxName.compare(trun) === 0) {
                            trunOffset = this.mpu.descriptor;
                        }
                        else if (boxName.compare(tfdt) === 0) {
                            this.mpu.decodingTime = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
                        }

                        this.mpu.descriptor += (tsbSize - 8);
                        tSize -= tsbSize;
                    }

                    this.mpu.descriptor = trunOffset;
                    if(trafId === this.mpu.video_trak_id) {
                        let flags = 0;
                        let sample_count = 0;
                        let data_offset = 0;
                        let skipnum = 0;
                        let sizeValueOffset = 0;
                        //console.log("Flag position: "+this.mpu.descriptor);

                        flags = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor) & 0x00FFFFFF;
                        //console.log("Flag: "+flags);
                        
                        sample_count = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor+4);
                        this.mpu.descriptor += 8;

                        if (flags & 0x01) {
                            data_offset = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                            this.mpu.descriptor += 4;
                        }
                        if (flags & 0x04) {
                            this.mpu.descriptor += 4;
                        }
                        skipnum = 0;

                        if (flags & 0x100) {
                            this.mpu.descriptor += 4;
                            skipnum += 4;
                        }
                        if (flags & 0x200) {
                            sizeValueOffset = this.mpu.descriptor;
                            skipnum += 4;
                        }
                        if (flags & 0x400) {
                            skipnum += 4;
                        }
                        if (flags & 0x800) {
                            skipnum += 4;
                        }
                        //console.log("sample_count: " + sample_count);
                        this.mpu.video_sample_count = sample_count;
                        console.log("this.mpu.video_sample_count: "+this.mpu.video_sample_count);
                        this.mpu.video_sample_size_offset = sizeValueOffset;
                        //console.log("this.mpu.video_sample_size_offset: "+this.mpu.video_sample_size_offset);
                        this.mpu.video_sample_size_seek_num = skipnum;
                        //console.log("this.mpu.video_sample_size_seek_num: "+this.mpu.video_sample_size_seek_num);
                        this.mpu.video_sample_offset = baseDataOffset + data_offset;
                        console.log("this.mpu.video_sample_offset: "+this.mpu.video_sample_offset);
                    }

                    if (trafId === this.mpu.hint_trak_id) {
                        let data_offset = 0;
                        this.mpu.descriptor += 8;
                        data_offset = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
                        this.mpu.descriptor += 4;

                        //console.log("baseDataOffset: "+baseDataOffset+", data_offset: " +data_offset);
                        this.mpu.hint_sample_offset = baseDataOffset + data_offset;
                        console.log("this.mpu.hint_sample_offset: "+this.mpu.hint_sample_offset);
                    }
                    this.mpu.descriptor = tsbOffset;
                }
                this.mpu.descriptor += (msbSize - 8);
                moofBoxSize -= msbSize;
            }
            console.log("--end if--------------------------------------------------------");
        }
        else {
            let video_sample_size = 0;
            let hint_sample_size = 4;
            console.log("--else----------------------------------------------------------");
            //console.log("this.mpu.video_sample_count: "+this.mpu.video_sample_count);
            this.mpu.descriptor = this.mpu.video_sample_size_offset;
            //console.log("this.mpu.descriptor: "+this.mpu.descriptor);
            video_sample_size = this.getIntTo4ByteBuffer(this.mpu.data, this.mpu.descriptor);
            //console.log("video_sample_size: "+video_sample_size);
            this.mpu.descriptor += 4;
            
            if (this.mpu.asset_type === AssetType.timed) {
                hint_sample_size += 26;
            }
            else {
                hint_sample_size += 2;
            }
            //console.log("hint_sample_size: "+hint_sample_size);
            this.mpu.video_sample_size_offset += this.mpu.video_sample_size_seek_num;
            this.mpu.video_sample_offset += video_sample_size;
            this.mpu.hint_sample_offset += hint_sample_size;

            console.log("this.mpu.video_sample_offset: "+this.mpu.video_sample_offset);
            console.log("this.mpu.hint_sample_offset: "+this.mpu.hint_sample_offset);
            console.log("--end else-----------------------------------------------------");
        }
    }
}
module.exports = MPUDissolver;

/*
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
*/