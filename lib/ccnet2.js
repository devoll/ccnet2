/**
 * Created by Pavel Nikitaev <devoll@devoll.ru on 20.02.15.
 */

// @todo: создать процесс согласно документации sequence diagramm

var SerialPort = require("serialport"),
    commands = require('./commands.js'),
    async  = require('async'),
    debugMode = false;

/**
 * Constructor
 * @param path {string} path to COM port
 * @param deviceType {number} hex-number of device's type
 * @param debug {Boolean} debug mode
 * @constructor
 */
function CCNET(path, deviceType, d){

    this.sync = 0x02;           // Constant
    this.device = deviceType;   // Type of device
    this.isConnect = false;     // Connection device status
    this.busy = false;          // Status of device
    this.command = false;       // Currency command object
    debugMode = d ? d : false;      // Debug mode

    debug("Getting device type...");

    // Check device types
    switch(this.device){

        case 0x01:
            debug("Bill-to-Bill unit");
            throw new Error("Not implemented yet");
            break;

        case 0x02:
            debug("Bill-to-Bill unit");
            throw new Error("Coin changer");
            break;

        case 0x03:
            debug("Bill Validator");
            break;

        case 0x04:
            debug("Card Reader");
            throw new Error("Not implemented yet");
            break;


        default:
            throw new Error("Unknown device type: " + deviceType);
    }

    this.serialPort = new SerialPort.SerialPort(path, {
        baudrate: 9600,
        databits: 8,
        stopbit: 1,
        parity: 'none',
        parser: SerialPort.parsers.raw
    }, false);
}

CCNET.prototype = {

    /**
     * Connect to device
     * @param cb {Function} Callback function
     */
    connect: function(cb){

        var self = this;

        async.waterfall([

            // Connect to device
            function(callback){
                self.serialPort.open(callback);
            },

            // Reset
            function(callback){
                self.isConnect = true;
                self.execute('RESET', null, callback);
            },

            // Waiting "Unit disabled" status
            function(r, callback){
                var timer = setInterval(function(){
                    self.execute('POLL', null, function(err, data){
                        switch(data.toString('hex')){

                            // Device rebooted
                            case "19":
                                clearInterval(timer);
                                callback();
                                break;
                        }
                    });
                }, 100);
            },

            // Get status
            function(callback){
                //@todo: get status
                callback();
            },

            // Get Bill Table
            function(callback){
                // @todo: get bill table
                callback();
            },

            // Set security
            function(callback){
                // @todo: set security
                callback();
            },

            // Identification
            function(callback){
                self.execute('IDENTIFICATION', null, callback);
            },

            function(data){
                cb(null, data);
            }

        ], function(err){
            if(err){
                return cb(err);
            }
        });

    },

    /**
     * Disconnect from device
     * @param cb {Function} callback function
     */
    close: function(cb){
        this.serialPort.close(cb);
    },

    /**
     * Send command to device and prepare the answer
     * @param command {String} Command name
     * @param data {Object} Command data
     * @param cb {Function} Callback function
     */
    execute: function(command, data, cb){
        if(this.isConnect == false){
            return cb(new Error("Device is not connected!"));
        }

        this.command = commands[command];

        if(this.command == undefined){
            return cb(new Error("Command not found: " + command));
        }

        if(this.busy){
            return cb(new Error("Device is busy"));
        }

        this._sendCommand(this.command.request(data), cb);
    },

    /**
     * Escrow banknotes
     * @param a {Array} hex-numberic array
     * @param b {Function} callback function
     */
    escrow: function(a, b){

        var billsEnable, cb, billTable;

        switch(typeof a){
            case "array":
                billsEnable = a;
                cb = b;
                break;

            case "function":
                cb = a;
                billsEnable = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
                break;

            default:
                throw new Error('Undefined parameters');
                break;
        }

        var self = this;

        async.waterfall([

            function(callback){
                self.execute('GET BILL TABLE', null, callback);
            },

            function(btbl, callback){
                billTable = btbl;
                self.execute('ENABLE BILL TYPES', billsEnable, callback);
            },

            function(){
                setInterval(function(){
                    self.execute('POLL', null, function(err, data){
                        if(err){
                            debug(err);
                            return;
                        }

                        // Handle new state
                        if(data[0].toString(16) == '80'){
                            cb.call(self, null, billTable[data[1]]);
                        }
                    });
                }, 100);
            }

        ], function(err){
           return cb(err);
        });


    },

    /**
     * Stack banknote
     * @param cb
     */
    stack: function(cb){
        this.execute('STACK', null, cb);
    },

    /**
     * Return banknote
     * @param cb
     */
    retrieve: function(cb){
        this.execute('RETURN', null, cb);
    },

    /**
     * End of stack
     * @param cb
     */
    end: function(cb){
        this.execute('ENABLE BILL TYPES', [0x00, 0x00, 0x00, 0x00, 0x00, 0x00], cb);
    },

    // Helper for send and receive commands
    _sendCommand: function(c, callback){
        this.busy = true;
        var self = this;

        var cmd = Buffer.concat([new Buffer(
            [
                this.sync,    // SYNC
                this.device  // ADR
            ]
        ), new Buffer([(c.length + 5)]),c]);

        cmd = Buffer.concat([cmd, getCRC16(cmd)]);

        this.serialPort.write(cmd, function(err){
            if(err){
                self.busy = false;
                return callback(err);
            }
        });

        var b = false,
            ln= 0;

        var listener = function(data){

            if(b){
                b = Buffer.concat([b, data]);
            }else{
                b = data;
            }

            // Set response length
            if(b.length >= 3 && ln == 0){
                ln = parseInt(b[2].toString());
            }

            if(ln == b.length){
                self.serialPort.removeListener('data', listener);
                self.busy = false;
                return self._checkResponse(b, callback);
            }

        };

        this.serialPort.on('data', listener);
    },

    // Check response
    _checkResponse: function(response, callback){

        var self = this;
        // Check response address
        if(response[0] != this.sync || response[1] != this.device){
            return callback(new Error("Wrong response target"));
        }

        // Check CRC
        var ln = response.length,
            checkCRC = response.slice(ln-2, ln),
            responseCRCslice = response.slice(0, ln-2),
            data = response.slice(3, ln-2);

        if(checkCRC.toString() != (getCRC16(responseCRCslice)).toString()){
            return callback(new Error("Wrong response command hash"));
        }else{
            var cmd = new Buffer([0x02, self.device, 0x06, 0x00]),
                c = Buffer.concat([cmd, getCRC16(cmd)]);

            self.serialPort.write(c, function(err){
                if(typeof callback == 'function') {
                    return callback.call(self, err, self.command.response(data));
                }
            });
        }
    }
};

module.exports = function(path, device, debug){
    return new CCNET(path, device, debug);
};

// Helper for calculation CRC16 check sum
function getCRC16(bufData) {
    var POLYNOMIAL = 0x08408;
    var sizeData = bufData.length;
    var CRC, i, j;
    CRC = 0;
    for (i = 0; i < sizeData; i++) {
        CRC ^= bufData[i];
        for (j = 0; j < 8; j++) {
            if (CRC & 0x0001) {
                CRC >>= 1;
                CRC ^= POLYNOMIAL;
            } else CRC >>= 1;
        }
    }

    var buf = new Buffer(2);
    buf.writeUInt16BE(CRC, 0);
    CRC = buf;

    return Array.prototype.reverse.call(CRC);
}

// Debug log helper
function debug(message){
    if(debugMode) {
        console.log(message);
    }
}