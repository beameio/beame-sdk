/**
 * Created by zenit1 on 04/07/2016.
 */

var developerServices = new(require('../../src/core/DeveloperServices'))();
var atomServices = new(require('../../src/core/AtomServices'))();
var edgeClientServices = new(require('../../src/core/EdgeClientServices'))();

var createEdgeClient = function (devHostname,appHostName) {
    edgeClientServices.createEdgeClient(devHostname,appHostName,function(error,payload){
        if(!error){
            console.log('/**********Create Edge Client Response***********/',payload);
        }
        else{
            console.error(error);
        }
    });
};

var createAtom = function(devHostname){
    atomServices.createAtom(devHostname,'satom',function(error,payload){
        if(!error){
            console.log('/**********Create Atom Response***********/',payload);
            var appHostname = payload.hostname;
            createEdgeClient(devHostname,appHostname);
        }
        else{
            console.error(error);
        }
    });
};

var createDeveloper = function(){
    developerServices.createDeveloper('SergeD', 'sd@beame.io',function(error, payload){
        if(!error){
            console.log('/**********Create Developer Response***********/',payload);
            var developerHostname = payload.hostname;
            createAtom(developerHostname);
        }
        else{
            console.error(error);
        }
    });
};

createDeveloper();

