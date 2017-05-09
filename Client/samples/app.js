var MMTPlayer = require("../src/mmt-player.js");

/**
 * The application layer of the test application.
 * @class
 */
var app = function() {};
/**
 * The video element owned by the app.
 *
 * @private {HTMLVideoElement}
 */
app.video = null;

/**
 * The player object owned by the app.
 *
 * @private {NexWebPlayer}
 */
app.player = null;

/**
 * The content url (mpd or m3u8)
 *
 * @private {http url string}
 */
app.contentUrl = "http://10.10.15.27:8000/dash264/TestCases/1a/netflix/exMPD_BIP_TC1.mpd";


/**
 * Initializes the application.
 */
app.init = function() {
  var playerControls = null;
  
  app.video = 
      /** @type {!HTMLVideoElement} */ (document.getElementById("videoTag"));

  app.player = new MMTPlayer(app.video, playerControls/*, contentUrl*/);
  
//  playerControls.init(app.video_);  
};

if (document.readyState == "complete" ||
    document.readyState == "interactive") {
  app.init();
} else {
  document.addEventListener("DOMContentLoaded", app.init);
}