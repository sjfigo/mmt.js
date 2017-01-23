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
app.video_ = null;


/**
 * The player object owned by the app.
 *
 * @private {NexWebPlayer}
 */
app.player_ = null;


/**
 * The content url (mpd or m3u8)
 *
 * @private {http url string}
 */
app.contentUrl_ = "http://10.10.15.27:8000/dash264/TestCases/1a/netflix/exMPD_BIP_TC1.mpd";


/**
 * Initializes the application.
 */
app.init = function() {
  app.video_ =
      /** @type {!HTMLVideoElement} */ (document.getElementById('video'));

  app.player_ = new MMTPlayer(app.video_, playerControls, app.contentUrl_);
  
  playerControls.init(app.video_);  
};


if (document.readyState == 'complete' ||
    document.readyState == 'interactive') {
  app.init();
} else {
  document.addEventListener('DOMContentLoaded', app.init);
}

