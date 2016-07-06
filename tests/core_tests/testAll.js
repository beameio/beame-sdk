/**
 * Created by zenit1 on 04/07/2016.
 */
var _ = require('underscore');
var developerServices = new(require('../../src/core/DeveloperServices'))();
var atomServices = new(require('../../src/core/AtomServices'))();
var edgeClientServices = new(require('../../src/core/EdgeClientServices'))();

var createEdgeClient = function (devHostname,appHostName) {
    edgeClientServices.createEdgeClient(devHostname,appHostName,function(error,payload){
        if(!error){
            console.log('/**********Create Edge Client Response***********/');
            console.log(payload);
        }
        else{
            console.error(error);
        }
    });
};

var createAtom = function(appName,devHostname,edges){
    atomServices.createAtom(devHostname,appName,function(error,payload){
        if(!error){
            console.log('/**********Create Atom Response***********/');
            console.log(payload);
            var appHostname = payload.hostname;

            for (var i = 0; i < edges; i++) {
                process.nextTick(
                    function(){
                        createEdgeClient(devHostname,appHostname);
                    }
                );
            }
        }
        else{
            console.error(error);
        }
    });
};

var createDeveloper = function(name, email, atoms, edges){
    developerServices.createDeveloper(name, email,function(error, payload){
        if(!error){
            console.log('/**********Create Developer Response***********/');
            console.log(payload);
            var developerHostname = payload.hostname;

            for (var i = 0; i < atoms; i++) {

                process.nextTick(
                    function (j) {
                        createAtom(name + '-app_' + j,developerHostname,edges);
                    }.bind(null,i)

                );

            }
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


    for (var i = 1; i <= developers; i++) {

        process.nextTick(
            function (j) {
            createDeveloper('dev-' + j, 'dev-' + j + '@beame.io', atoms, edges);
        }.bind(null,i)

        );

    }
};


start();

