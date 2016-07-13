/**
 * Created by zenit1 on 04/07/2016.
 */
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');

var atomServices = new(require('../../src/core/AtomServices'))();





var revoke = function(devHost,appHost){
    atomServices.revokeCert(devHost,appHost,function(error, payload){
        if(!error){
            console.log(payload);
            process.exit(0);
        }
        else{
            console.error(error);
            process.exit(1);
        }
    });
};

var create =  function (devHostname,appName){
    atomServices.createAtom(devHostname,appName,function(error,payload){
        if(!error){
            console.log(payload);
            process.exit(0);
            // atomServices.updateAtom(devHostname,payload.hostname,'atom1-upd',function(error,payload){
            //     if(!error){
            //         console.log(payload);
            //     }
            //     else{
            //         console.error(error);
            //     }
            // });
        }
        else{
            console.error(error);
            process.exit(1);
        }
    });
};

var renew = function(devHost,appHost){
    atomServices.renewCert(devHost,appHost,function(error, payload){
        if(!error){
            console.log(payload);
            process.exit(0);
        }
        else{
            console.error(error);
            process.exit(1);
        }
    });
};

var test = function(){
    var test = argv['test'] || 'renew';

    if(_.isEmpty(test)){
        console.error('test required');
        process.exit(1);
    }

    var devHost = argv['devhost'] || 'l6nvbpxlf91odbl1.v1.beameio.net';

    var host = argv['host'] || 'ajcn56e4a856vmmu.l6nvbpxlf91odbl1.v1.beameio.net';



    switch (test){
        case 'create':

            if(_.isEmpty(devHost)){
                console.error('devHost required');
                process.exit(1);
            }
            create(devHost,argv['name'] || 'test app');
            return;
        case 'revoke':
            if(_.isEmpty(devHost)){
                console.error('devHost required');
                process.exit(1);
            }
            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }
            revoke(devHost,host);
            return;

        case 'renew':
            if(_.isEmpty(devHost)){
                console.error('devHost required');
                process.exit(1);
            }
            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }

            renew(devHost,host);
            return;

    }
};


test();