var that = null;

class mmtContentManager {
    constructor () {
        this.assetList = [];

        let asset = [];
        asset.push("/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/000.mp4");
        asset.push("/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/001.mp4");
        asset.push("/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/002.mp4");
        asset.push("/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/003.mp4");
        asset.push("/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/004.mp4");
        asset.push("/Users/daehee/Git/MMT-WebPlayer/mpu-manager/mpus/005.mp4");

        this.assetList.push({
            id : 0,
            asset : asset
        });

        for(let i=0; i<5; i++) {
            console.log(this.assetList[0].asset[i]);
        }

        that = this;
    }

    getAsset (id) {
        console.log("asset id - " + id);
        let assetInfo = that.assetList.find(function findAsset (obj) {
            console.log("obj.id - " + obj.id);
            return obj.id === id;
        });

        if (assetInfo) {
            return assetInfo.asset;
        }
        else {
            return null;
        }
    }

    
}

module.exports = mmtContentManager;