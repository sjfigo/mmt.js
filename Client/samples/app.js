  /**
   * The application layer of the test application.
   * @class
   */
  var app = function() {
  /**
   * The video element owned by the app.
   *
   * @private {HTMLVideoElement}
   */
  var video = null;

  /**
   * The player object owned by the app.
   *
   * @private {NexWebPlayer}
   */
  var player = null;

  /**
   * The content url (mpd or m3u8)
   *
   * @private {http url string}
   */
  var contentUrl = "http://10.10.15.27:8000/dash264/TestCases/1a/netflix/exMPD_BIP_TC1.mpd";

  /**
   * Initializes the application.
   */
  var init = function() {
    var playerControls = null;
    var MMTPlayer = require("../src/MMTPlayer.js").MMTPlayer;
    video = null;
        /** @type {!HTMLVideoElement} */ //(document.getElementById("video"));

    player = new MMTPlayer(video, playerControls, contentUrl);
    player.init();
    console.log(player);
    
  //  playerControls.init(app.video_);  
  };

  return {
    init : init
  };
};

var webApp = new app();
webApp.init();

