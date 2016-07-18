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
    developerServices.createDeveloper('Serge Zenit', 'zenit123@beame.io',function(error, payload){
        if(!error){
            console.log(payload);
        }
        else{
            console.error(error);
        }
    });
};

var restore = function(host){
    developerServices.restoreCert(host,function(error, payload){
        if(!error){
            console.log(payload);
        }
        else{
            console.error(error);
        }
    });
};
var renew = function(host){
    developerServices.renewCert(host,function(error, payload){
        if(!error){
            console.log(payload);
        }
        else{
            console.error(error);
        }
    });
};

var stats = function(host){
    developerServices.getStats(host,function(error, payload){
        if(!error){
            console.log(payload);
        }
        else{
            console.error(error);
        }
    });
};

var complete = function(host,uid){
    developerServices.completeDeveloperRegistration(host,uid,function(error, payload){
        if(!error){
            console.log(payload);
        }
        else{
            console.error(error);
        }
    });
};



var test = function(){
    var test = argv['test'] || 'stats';

    if(_.isEmpty(test)){
        console.error('test required');
        process.exit(1);
    }

    var host = argv['host'] || 'lawhv2o7vw0j2td9.v1.beameio.net';

    switch (test){
        case 'create':
            create();
            return;
        case 'revoke':

            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }
            revoke(host);
            return;
        case 'stats':

            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }
            stats(host);
            return;
        case 'restore':

            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }
            restore(host);
            return;
        case 'renew':

            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }
            renew(host);
            return;

        case 'complete':

            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }

            var uid = argv['uid'] || '6685c5a3-9a6e-4db5-99ed-8f3df98f2e9e';

            if(_.isEmpty(uid)){
                console.error('uid required');
                process.exit(1);
            }

            complete(host,uid);
            return;
    }
};


test();
