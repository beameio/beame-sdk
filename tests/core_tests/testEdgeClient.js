/**
 * Created by zenit1 on 04/07/2016.
 */
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');
var edgeClientServices = new(require('../../src/core/EdgeClientServices'))();

var revoke = function(edgeHost){
    edgeClientServices.revokeCert(edgeHost,function(error, payload){
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

var create =  function (atomHostname){
    edgeClientServices.createEdgeClient(atomHostname, function(error,payload){
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

var renew = function(edgeHost){
    edgeClientServices.renewCert(edgeHost,function(error, payload){
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

var getStats = function(edgeHost){
    edgeClientServices.getStats(edgeHost,function(error, payload){
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

var deleteEdge = function(edgeHost){
    edgeClientServices.deleteAtom(edgeHost,function(error, payload){
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
    var cmd = argv['cmd'] || 'stats';

    if(_.isEmpty(cmd)){
        console.error('test required');
        process.exit(1);
    }

    var atomHost = argv['atom-host'] || 'cxdtgpfu6ate4gpc.s31udwye0z9eyck7.v1.beameio.net';

    var host = argv['host'] || 'wd565lswi7j4aew3.v1.r.d.edge.eu-central-1a-1.v1.beameio.net';

    switch (cmd){
        case 'create':

            if(_.isEmpty(atomHost)){
                console.error('devHost required');
                process.exit(1);
            }
            create(atomHost);
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
        case 'delete':
            if(_.isEmpty(host)){
                console.error('host required');
                process.exit(1);
            }

            deleteEdge(host);
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


