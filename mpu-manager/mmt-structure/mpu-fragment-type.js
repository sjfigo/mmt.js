var MPU_Fragment_Type = {
    Movie_Fragment_Metadata : 0x00,    // moof and mdat header
    MPU_Metadata : 0x01,    // ftyp, mmpu, moov
    MFU : 0x02     // mdat samples and sub-samples
}
module.exports = MPU_Fragment_Type;