/**
 * Created by zenit1 on 04/07/2016.
 */
var _ = require('underscore');

var store = new(require('../../src/services/BeameStore'))();
var developerServices = new(require('../../src/core/DeveloperServices'))();
var atomServices = new(require('../../src/core/AtomServices'))();
var edgeClientServices = new(require('../../src/core/EdgeClientServices'))();

var createEdgeClient = function (appHostName,callback) {
    edgeClientServices.createEdgeClient(appHostName,function(error,payload){
        if(!error){
            console.log('/**********Create Edge Client Response***********/');
            console.log(payload);
            callback(null,payload);
        }
        else{
            console.error(error);
            callback(error,null);
        }
    });
};

var createAtom = function(appName,devHostname,edges,callback){
    atomServices.createAtom(devHostname,appName,function(error,payload){
        if(!error){
            console.log('/**********Create Atom Response***********/');
            console.log(payload);
            var appHostname = payload.hostname;

            var create = function(){
                edges--;
                createEdgeClient(appHostname,edgeCb);
            };

            var edgeCb = function(error,data){
                if(error){
                    console.error('Edge not created for ' + appName,error);
                }

                if(edges>0){
                   create();
                }
                else{
                    callback && callback(null,true);
                }
            };

            create();


        }
        else{
            console.error(error);
        }
    });
};

var createDeveloper = function(name, email, atoms, edges, callback){
    developerServices.createDeveloper(name, email,function(error, payload){
        if(!error){
            console.log('/**********Create Developer Response***********/');
            console.log(payload);
            var developerHostname = payload.hostname;

            var create = function () {
                atoms--;
                createAtom(name + '-app-' + atoms,developerHostname,edges,atomCb);
            };

            var atomCb = function(error,data){
                if(error){
                    console.error('Atom not created for ' + developerHostname,error);
                }

                if(atoms>0){
                    create();
                }
                else{
                    callback && callback(null,true);
                }
            };

            create();

        }
        else{
            console.error(error);
        }
    });
};

var start = function () {

    var developers = process.argv[2] || 1;
    var atoms = process.argv[3] || 1;
    var edges = process.argv[4] || 1;

    var create = function () {
        developers--;
        createDeveloper('devst-' + developers, 'dev-20-test-' + developers + '@beame.io', atoms, edges,devCb);
    };

    var devCb = function(error,data){
        if(error){
            console.error('Developer not created',error);
        }

        if(developers>0){
            create();
        }

    };

    create();
};


start();

