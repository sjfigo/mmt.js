// using open source
class ntp {
    constructor () {
        console.log("ntp constructor");
        //this.ntpClient = new ntpClient();
        //console.log('NTP constructor: ' + ntpClient);
    }

    get now () {
        let ntpDate = Date.now()
        /*var ntpClient = require('ntp-client');
        ntpClient.getNetworkTime("pool.ntp.org", 123, function(err, date) {
            if(err) {
                console.error(err);
                return;
            }
         
            console.log("Current time : ");
            console.log(date); // Mon Jul 08 2013 21:31:31 GMT+0200 (Paris, Madrid (heure d’été)) 
            ntpDate = date;
        });

        return ntpDate; //->>null*/
        //console.log("ntp.now: " + ntpDate + " - " + 2^32);
        return ntpDate % Math.pow(2, 32);
    }
}

module.exports = ntp;