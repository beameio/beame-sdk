"use strict";
var beameSDK = require ("beame-sdk");
var express = require('express');
var devHostname = "put-here-Hostname-you-got-when-creating-developer";
var appName = "Beame test";
var appExpress = express();
var edgeHostname;
appExpress.use(express.static(__dirname + '/public'));

var runTestBeameServer = function(){
    beameSDK.BaseHttpsServer.SampleBeameServer(edgeHostname,  appExpress, function (data, app) {
        console.log('Server started on: https://'+edgeHostname);
        appExpress.get('/', function(req, res) {
            res.sendFile(path.join(__dirname + '/index.html'));
        });
            // process http events here with <app> if needed
    });
};

// beameSDK.creds.createAtom(devHostname,appName, 1, function(data){
//     console.log('Just created atom with host:'+data.hostname);
//     beameSDK.creds.createEdgeClient(data.hostname, 1, function(edgeData){
//         edgeHostname = edgeData.hostname;
//         console.log('Congrats! My new hostname is: '+ edgeHostname);
//         setTimeout(runTestBeameServer, 2000);//JIC - wait dns to update
//     });
// });
