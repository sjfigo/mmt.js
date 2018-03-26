var ntpClient = require("ntp-client");

// using open source
class ntp {
    consturctor () {

    }

    get now () {
        let ntpDate = null;
        ntpClient.getNetworkTime("pool.ntp.org", 123, function(err, date) {
            if(err) {
                console.error(err);
                return;
            }
         
            //console.log("Current time : ");
            //console.log(date); // Mon Jul 08 2013 21:31:31 GMT+0200 (Paris, Madrid (heure d’été)) 
            ntpDate = date;
        });

        return ntpDate;
    }
}

module.exports = ntp;