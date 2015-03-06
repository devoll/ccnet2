/**
 * Created by Pavel Nikitaev <devoll@devoll.ru> on 20.02.15.
 */

module.exports = {

    'RESET' : {
        request: function(){
            return new Buffer([0x30]);
        },

        response: function(data){
            switch(data[0]){
                case 0:
                    return "Done";
                    break;

                case 255:
                    return "Error";
                    break;

                default:
                    return "Unknown response";
                    break;
            }
        }
    },

    'GET STATUS' : {
        request: function(){
            return new Buffer([0x31]);
        },

        response: function(data){

            function hex2bin(buf){

                var d = [];

                for(var i = 0, max = buf.length; i < max; i++){

                    // Iterator by bits
                    for(var j = 8; j > 0; j--){
                        if(buf[i] & Math.pow(2, j-1)){
                            d.push(true);
                        }else{
                            d.push(false);
                        }
                    }
                }

                return d.reverse();
            }

            return {
                enabledBills: hex2bin(data.slice(0, 3)),
                highSecurity: hex2bin(data.slice(3, 6))
            };
        }
    },

    'SET SECURITY' : {
        request: function(){
            return new Buffer([0x32]);
        },

        response: function(data){
            return data;
        }
    },

    'POLL' : {
        request: function(){
            return new Buffer([0x33]);
        },

        response: function(data){
            return data;
        }
    },

    'ENABLE BILL TYPES' : {
        request: function(data){

            data = new Buffer(data);

            return Buffer.concat([new Buffer([0x34]), data]);
        },

        response: function(data){

            switch(data[0]){
                case 0:
                    return "Done";
                    break;

                case 255:
                    return "Error";
                    break;

                default:
                    return "Unknown response";
                    break;
            }
        }
    },

    'STACK' : {
        request: function(){
            return new Buffer([0x35]);
        },

        response: function(data){
            return data;
        }
    },

    'RETURN' : {
        request: function(){
            return new Buffer([0x36]);
        },

        response: function(data){
            return data;
        }
    },

    'IDENTIFICATION' : {
        request: function(){
            return new Buffer([0x37]);
        },

        response: function(data){
            return {
                Part: data.slice(0, 15).toString().trim(),
                Serial: data.slice(15, 27).toString().trim(),
                Asset: data.slice(27, 34)
            };
        }
    },

    'HOLD' : {
        request: function(){
            return new Buffer([0x38]);
        },

        response: function(data){
            return data;
        }
    },

    'SET BARCODE PARAMETERS' : {
        request: function(){
            return new Buffer([0x39]);
        },

        response: function(data){
            return data;
        }
    },

    'EXTRACT BARCODE DATA' : {
        request: function(){
            return new Buffer([0x3A]);
        },

        response: function(data){
            return data;
        }
    },

    'GET BILL TABLE' : {
        request: function(){
            return new Buffer([0x41]);
        },

        response: function(data){

            var response = [],
                word;

            for(var i=0; i<24; i++){
                // Iterator by 5-byte world
                word = data.slice(i * 5, (i * 5 + 5));

                response.push({
                    amount: word[0] * Math.pow(10, word[4]),
                    code: word.slice(1, 4).toString()
                });
            }
            return response;
        }
    },

    'DOWNLOAD' : {
        request: function(){
            return new Buffer([0x50]);
        },

        response: function(data){
            return data;
        }
    },

    'GET CRC32 OF THE CODE' : {
        request: function(){
            return new Buffer([0x51]);
        },

        response: function(data){
            return data;
        }
    },

    'REQUEST STATISTICS' : {
        request: function(){
            return new Buffer([0x60]);
        },

        response: function(data){
            return data;
        }
    }
};