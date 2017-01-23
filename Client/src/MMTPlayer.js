var MMTPlayer = function (video, contotller) {
    this.video = document.querySelector('video');;
    this.controller = contotller;
};

MMTPlayer.constructor = MMTPlayer;

MMTPlayer.prototype.video = null;
MMTPlayer.prototype.contoller = null;

MMTPlayer.prototype.init = function () {
    this.video = document.querySelector('video');
};

MMTPlayer.prototype.onPlay = function () {

};