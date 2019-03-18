var MMTPlayer = require("../mmt-client.js");
var BrowserCode = require("../src/browser-code.js");

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
app.server_ip = "192.168.1.12";
app.server_port = 1337;


/**
 * Initializes the application.
 */
app.init = function() {  
  app.video = 
      /** @type {!HTMLVideoElement} */ (document.getElementById("videoTag"));

  var browserCode = new BrowserCode(window, document);

  app.player = new MMTPlayer(app.video, browserCode.currentBrowserCode);
  app.player.callSetupConnect(app.server_ip, app.server_port);
};

if (document.readyState == "complete" ||
    document.readyState == "interactive") {
  app.init();
} else {
  document.addEventListener("DOMContentLoaded", app.init);
}