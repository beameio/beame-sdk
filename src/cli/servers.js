"use strict";
var debug       = require("debug")("beame_servers");
var BeameStore  = require("../services/BeameStore");
var BeameServer = require("../services/BaseHttpsServer").SampleBeameServer;

var beameSDK    = require("../../index.js");
var express     = require('express');
var appExpress  = express();
// This require is only cause the example is inside the beame-sdk repository, you will be using require('beame-sdk');
var creds       = beameSDK.creds;
var developers  = beameSDK.creds.list("developer", "", "JSON");
var atoms       = beameSDK.creds.list("atom", "", "JSON");
var edgeclients = beameSDK.creds.list("edgeclient", "", "JSON");
//var developerHostname;
var edgeClientCreated;
//var argv = require('minimist')(process.argv.slice(2));

var path                = require('path');
var defaultSharedFolder = path.resolve(__dirname, "../../examples/public/shared");
var defaultPublicDir    = path.resolve(__dirname, "../../examples/public");
function HttpsServerTestStart(edgeClientFqdn) {
	console.warn("Starting server %j", edgeClientFqdn);
	new BeameServer(edgeClientFqdn, null, false, function (data, app) {
		debug("BeameServer callback got %j", data);
		app.on("request", function (req, resp) {
			resp.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
			resp.end('hello world\n');
			console.warn("%j %j %j", req.method, req.url, req.headers);
		});

		var socketio = require('socket.io')(app);
		//noinspection JSUnresolvedFunction
		socketio.set('transports', ['websocket']);

		//noinspection JSUnresolvedFunction
		socketio.on('connection', function (socket) {
			console.warn("Socketio connection");
			socket.emit('iping', {hello: 'world'});
			socket.on('ipong', function () {
				socket.emit('iping', {hello: 'world'});
			});
		});
	});
}

function runTestBeameServer(hostname) {
	beameSDK.BaseHttpsServer.SampleBeameServer(hostname, null, appExpress, function (data, app) {
		//noinspection JSUnresolvedFunction
		appExpress.use(express.static(defaultPublicDir));

		var serveIndex = require('serve-index');

		console.warn('Server started on https://' + hostname + " this is a publicly accessible address");
		appExpress.use('/shared', serveIndex(defaultSharedFolder, {'icons': true}));
		console.warn("****************************************************************************************************");
		console.warn("*****************************SERVER **********************STARTED***********************************");
		console.warn("Server Local Directory " + defaultSharedFolder);
		console.warn("****************************************************************************************************");


		//noinspection JSUnusedLocalSymbols
		app.on("request", function (req, resp) {
			console.warn("On Request %j %j %j", req.method, req.url, req.headers);
		});

		//noinspection JSUnusedLocalSymbols
		app.on("upgrade", function (req, resp) {
			console.warn("On upgrade %j %j %j", req.method, req.url, req.headers);
		});

		var socketio = require('socket.io')(app);
		var chat     = require('../../examples/chat/chatserver.js')(socketio);
	});
}

var startFirstBeameNode = function (sharedFolder) {

	if (sharedFolder) {
		console.warn("Custom folder specified");
		defaultSharedFolder = path.resolve(sharedFolder);
	}

	if (developers.length == 0) {
		console.error("You don't have developer credentials in your .beame folder, please go to ");
		console.error(" https://registration.beameio.net and register with your email ");
		console.error("it will contain a command that looks like 'beame creds createDeveloper ......");
		console.error("Please run that command and then relaunch the example ");
	}

	if (edgeclients.length > 0) {
		console.warn("You have edgeclient ready to go starting ....");
		runTestBeameServer(edgeclients[0].hostname);
		return;
	}

	if (atoms.length == 0 && edgeclients.length == 0 && developers.length > 0) {
		console.warn("You have developer credentials now we will set up an Atom SSL cert, and  edgeClient cert ");
		console.warn("It will take about 30 seconds, please wait patiently, yes we understand..., it will be much faster soon (:- ");
		var devHostname = developers[0].hostname;
		beameSDK.creds.createAtom(devHostname, "BeameNodeXXX", 1, function (data) {
			console.warn('Just created atom with host:' + data.hostname);
			beameSDK.creds.createEdgeClient(data.hostname, 1, function (edgeData) {
				var edgeHostname = edgeData.hostname;
				console.warn('Congrats! My new hostname is: https://' + edgeHostname);
				//setTimeout(runTestBeameServer(edgeHostname), 2000);//JIC - wait dns to update
				runTestBeameServer(edgeHostname);
				edgeClientCreated = true;
			});
		});
	}

	if (atoms.length > 0 && edgeclients.length === 0) {
		console.warn("You already have atom credentials your atom hostname is %j", atoms[0].hostname);
		console.warn("All we need to do is to create the webserver aka edgeCert for the demo, about 30 seconds, yes its slow, but not for long");

		beameSDK.creds.createEdgeClient(atoms[0].hostname, 1, function (edgeData) {
			var edgeHostname = edgeData.hostname;
			console.warn('Congrats! My new hostname is: https://' + edgeHostname);
			//setTimeout(runTestBeameServer(edgeHostname), 2000);//JIC - wait dns to update
			runTestBeameServer(edgeHostname);
			edgeClientCreated = true;
		});
	}
};


module.exports = {
	HttpsServerTestStart: HttpsServerTestStart,
	                      startFirstBeameNode

};
