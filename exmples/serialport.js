/**
 * Created by Pavel Nikitaev <devoll@devoll.ru> on 20.02.15.
 */

var ccnet = require("../lib/ccnet2")(
        '/dev/tty.usbserial',   // Serial address
        0x03,                   // Device type
        false                    // enable debug
    );

ccnet.connect(function(err, info){
    if(err) throw err;

    console.log(info); // Information about connected device

    // Enable bangknotes accept
    ccnet.escrow(function(err, banknote){
        if(err) throw err;

        console.log(banknote); // Information about inserted banknote

        // Accept inserted banknote
        ccnet.stack(function(err){
            if(err) throw err;

            // End accepting banknotes
            ccnet.end(function(err){
                if(err) throw err;

                ccnet.close(function(err){
                    if(err) throw err;
                    console.log("Disconnect");
                });
            });
        });
    });
});