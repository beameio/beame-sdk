/**
 * Created by zenit1 on 04/07/2016.
 */
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');

var atomServices = new(require('../../src/core/AtomServices'))();

var revoke = function(appHost){
    atomServices.revokeCert(appHost,function(error, payload){
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

var renew = function(appHost){
    atomServices.renewCert(appHost,function(error, payload){
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

var getStats = function(appHost){
    atomServices.getStats(appHost,function(error, payload){
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

var deleteAtom = function(appHost){
    atomServices.deleteAtom(appHost,function(error, payload){
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

var updateAtom = function(appHost,name){
    atomServices.updateAtom(appHost,name,function(error, payload){
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
    var cmd = argv['cmd'] || 'renew';

    if(_.isEmpty(cmd)){
        console.error('test required');
        process.exit(1);
    }

    var devHost = argv['devhost'] || 'bufp77dx7bemrqv4.v1.beameio.net';

    var host = argv['host'] || 'gbbnka2gaj5ggcvv.v1.r.d.edge.eu-central-1b-1.v1.beameio.ne';

    switch (cmd){
        case 'create':

            if(_.isEmpty(devHost)){
                console.error('devHost required');
                process.exit(1);
            }
            create(devHost,argv['name'] || 'test app-6');
            return;
        case 'revoke':

            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }
            revoke(host);
            return;

        case 'renew':

            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }

            renew(host);
            return;
        case 'update':
            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }

            updateAtom(host,'apa-ahuyapa');
            return;
        case 'delete':
            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }

            deleteAtom(host);
            return;
        case 'stats':
            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }

            getStats(host);
            return;

    }
};


test();