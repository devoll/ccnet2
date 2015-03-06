/**
 * Created by Pavel Nikitaev <devoll@devoll.ru> on 20.02.15.
 */

var ccnet = require("../lib/ccnet2")(
        '/dev/tty.usbserial',   // Serial address
        0x03                    // Device type
    ),
    async = require("async")

async.waterfall([

    // Connect to device
    function(callback){
        ccnet.connect(callback);
    },

    function(callback){
        ccnet.escrow(callback);
    },

    function(data, callback){
        console.log("Get bill: " + JSON.stringify(data));
        ccnet.stack(callback);
    },

    function(callback){
        console.log('Stack ok');
        ccnet.end(callback);
    }

], function(err){
    if(err){
        throw err;
    }
});