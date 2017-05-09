class MPUWriter {
    constructor () {
        this.orgData = NULL;
        this.orgType = NULL;
        this.mpus = [];
    }

    get mpus () {
        if (this.orgData === NULL || this.orgType === NULL) {
            return NULL;
        }
        else {
            switch (this.orgType) {
                case MPUWriter_OrgType.MP4:
                    this.mpus = fragmentMP4 (this.orgData);
                    break;
                default:

            }
        }
        return this.mpus;
    }

    set mp4 (mp4) {
        if (this.orgData === NULL) {
            if (!checkMP4()) {
                return false;
            }
            this.orgData = mp4;
            this.orgType = MPUWriter_OrgType.MP4;
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Todo
     * @param {*} mp4 
     */
    static checkMP4 (mp4) {
        return true;
    }

    static fragmentMP4 (mp4) {
        let mpus = [];


    }
}
module.exports = MPUWriter;

var MPUWriter_OrgType = {
    unknown : 0x00,
    MP4 : 0x01
}
module.exports = MPUWriter_OrgType;

/*
var MPUWriter_ReturnValue = {
    SUCCESS : 0x00,
    FAIL_NO_ORIGINAL_DATA : 0x01,
    FAIL_
}*/

