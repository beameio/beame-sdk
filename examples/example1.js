"use strict";

var beameSDK = require("../index.js");
var express = require('express');
var appExpress = express();
// This require is only cause the example is inside the beame-sdk repository, you will be using require('beame-sdk');
var creds = beameSDK.creds;
var developers = beameSDK.creds.list("developer", "", "JSON");
var atoms = beameSDK.creds.list("atom", "", "JSON");
var edgeclients = beameSDK.creds.list("edgeclient", "", "JSON");
var developerHostname;
var edgeClientCreated;
var argv = require('minimist')(process.argv.slice(2));

var sharedFolder =__dirname + '/public/shared';
console.log(argv);
if(argv.sharedFolder){
	console.log("Custom folder specified");
	var path = require('path');
	var sharedPath = path.resolve(argv.sharedFolder);
	sharedFolder = sharedPath;
}

var runTestBeameServer = function(hostname){
    beameSDK.BaseHttpsServer.SampleBeameServer(hostname, appExpress, function (data, app) {
		appExpress.use(express.static(__dirname + '/public'));

		var serveIndex = require('serve-index');

		console.log('Server started on https://'+hostname + " this is a publically accessible address");
		appExpress.use('/shared', serveIndex(sharedFolder, {'icons': true}));
		console.log("****************************************************************************************************");
		console.log("*****************************SERVER **********************STARTED***********************************");
		console.log("Server Local Directory " + sharedFolder);
	console.log("****************************************************************************************************");


		app.on("request", function (req, resp){
			console.log("On Request %j %j %j", req.method, req.url, req.headers );
		});

		app.on("upgrade", function (req, resp){
			console.log("On upgrade %j %j %j", req.method, req.url, req.headers );
		});

		var socketio = require('socket.io')(app);
		var chat = require('./chat/chatserver.js')(socketio);
    });
};
if(developers.length == 0){
		console.error("You dont have developer credentials in your .beame folder, please go to ");
		console.error(" https://registration.beameio.net and register with your email " );
		console.error("it will contain a command that looks like 'beame creds createDeveloper ......");
		console.error("Please run that command, and then relaunch the example ");
}

if(edgeclients.length> 0){
	console.log("You have edgeclient ready to go starting ....");
	runTestBeameServer(edgeclients[0]._srvFqdn);
	return;
}

if(atoms.length == 0 && edgeclients.length ==  0 && developers.length > 0){
	console.log("You have developer credentials; now we will set up an Atom SSL cert, and actual edgeClient cert ");
	console.log("It will take about 30 seconds please wait patiently, yes we understand..., it will be much faster soon");
	var devHostname = developers[0]._srvFqdn;
	beameSDK.creds.createAtom(devHostname ,"BeameNode2", 1, function(data){
		console.log('Just created atom with host:'+data._srvFqdn);
		beameSDK.creds.createEdgeClient(data._srvFqdn, 1, function(edgeData){
			var edgeHostname = edgeData._srvFqdn;
			console.log('Congrats! My new hostname is: https://'+ edgeHostname);
			setTimeout(runTestBeameServer(edgeHostname), 2000);//JIC - wait dns to update
			edgeClientCreated = true;
			return;
		});
	});
}

if(atoms.length > 0 && edgeclients.length ===  0){
	console.log("You already have atom credentials your atom hostname is %j", atoms[0]._srvFqdn);
	console.log("All we need to do is to create the webserver aka edgeCert for the demo, about 30 seconds, yes its slow, but not for long");

	beameSDK.creds.createEdgeClient(atoms[0]._srvFqdn, 1, function(edgeData){
		var edgeHostname = edgeData._srvFqdn;
		console.log('Congrats! My new hostname is: https://'+ edgeHostname);
		setTimeout(runTestBeameServer(edgeHostname), 2000);//JIC - wait dns to update
		edgeClientCreated = true;
		return;
	});
}



