class BrowserCode {
    constructor (window, document) {
        this._window = window;
        this._document = document;

        this._node = 0;
        this._opera = 1;
        this._firefox = 2;
        this._safari = 3;
        this._ie = 4;
        this._edge = 5;
        this._chrome = 6;
        this._blink = 7;
    }

    get currentBrowserCode() {
        let browserCode = this._node;
        let isIE = false;
        let isChrome = false;
        let isOpera = false;

        // Opera 8.0+
        if ((!!this._window.opr && !!this._window.opr.addons) || !!this._window.opera || navigator.userAgent.indexOf(" OPR/") >= 0) {
            browserCode = this._opera;
            isOpera = true;
        }
        // Firefox 1.0+
        if (typeof InstallTrigger !== "undefined") {
            browserCode = this._firefox;
        }
        // Safari 3.0+ "[object HTMLElementConstructor]" 
        if (/constructor/i.test(this._window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!this._window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification))) {
            browserCode = this._safari;
        }
        // Internet Explorer 6-11
        if (/*@cc_on!@*/false || this._document.documentMode) {
            browserCode = this._ie;
            isIE = true;
        }
        // Edge 20+
        if (!isIE && this._window.StyleMedia) {
            browserCode = this._edge;
        }
        if (this._window.chrome) {
            browserCode = this._chrome;
            isChrome = true;
        }
        
        return browserCode;
    }

    get node () {
        return this._node;
    }
    get opera () {
        return this._opera;
    }
    get firefox () {
        return this._firefox;
    }
    get safari () {
        return this._safari;
    }
    get ie () {
        return this._ie;
    }
    get edge () {
        return this._edge;
    }
    get chrome () {
        return this._chrome;
    }
    get blink () {
        return this._blink;
    }

    getBrowserName (code) {
        switch(code) {
            case this._chrome:
                return "chrome";
            case this._safari:
                return "safari";
            case this._node:
                return "node";
            case this._opera:
                return "opera";
            case this._firefox:
                return "firefox";
            case this._ie:
                return "ie";
            case this._edge:
                return "edge";
            case this._blink:
                return "blink";
            default:
                return null;
        }
    }
}
module.exports = BrowserCode;