/**
 * Created by zenit1 on 03/07/2016.
 */
var _ = require('underscore');

var argv = require('minimist')(process.argv.slice(2));
var developerServices = new(require('../../src/core/DeveloperServices'))();


var revoke = function(host){
    developerServices.revokeCert(host,function(error, payload){
        if(!error){
            console.log(payload);
        }
        else{
            console.error(error);
        }
    });
};

var create =  function (){
    developerServices.createDeveloper('Serge Zenit', 'zenit1@beame.io',function(error, payload){
        if(!error){
            console.log(payload);
        }
        else{
            console.error(error);
        }
    });
};



var test = function(){
    var test = argv['test'] || 'revoke';

    if(_.isEmpty(test)){
        console.error('test required');
        process.exit(1);
    }

    switch (test){
        case 'create':
            create();
            return;
        case 'revoke':
            var host = argv['host'] || 'rgqwxrybpysyc1yr.v1.beameio.net';

            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }
            revoke(host);
            return;

    }
};


test();
