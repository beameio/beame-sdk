var https = require("https");
var ProxyClient = require("beame-ssl-proxy-client");
var beamestore = require("../services/BeameStore");

var _ = require('underscore');
var fs = require('fs');

var beameDirServices = require('../services/BeameDirServices');
var debug = require("debug")("SampleBeameServer");

var SampleBeameServer = function(instanceHostname, hostOnlineCallback){
    if(!instanceHostname) {
        new Error("No instance found");
    }
	var edgeCert = beamestore.searchEdge(instanceHostname);
	var options = {
		key: edgeCreds.PRIVATE_KEY,
		cert: edgeCreds.P7B,
		ca: edgeCreds.CA

		// Client certificates - start
//			requestCert: true,
//			rejectUnauthorized: false
		// Client certificates - end
	};

		var app = https.createServer(options);
		app.listen(0, function() {
			//ProxyClient(serverType, edgeClientHostname, edgeServerHostname, targetHost, targetPort, options, agent, edgeClientCerts)
			var onLocalServerCreated = function(data){
				hostOnlineCallback && hostOnlineCallback(data, app);

			}
			address = app.address();
			var proxy =new ProxyClient("HTTPS", creds.hostname, creds.edgeHostname, 'localhost', app.address().port, {"onLocalServerCreated": onLocalServerCreated } , undefined, options);
		});

	});
	//console.log("Found instance:", results);


	// looking for developer




}
/*
		var options = {
			key: instance.PRIVATE_KEY,
			cert: instance.P7B,
			ca: instance.CA,

			// Client certificates - start
//			requestCert: true,
//			rejectUnauthorized: false
			// Client certificates - end
		};

		var app = https.createServer(options, function(req, res){
			res.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
			res.end('hello world\n');
			console.log("returning hello world");
		});
		var socketio = require('socket.io')(app);

		socketio.on('connection', function (socket) {
			console.log("Socketio connection");
			socket.emit('iping', { hello: 'world' });
			socket.on('ipong', function (data) {
				socket.emit('iping', { hello: 'world' ,data:data});
			});
		});
		app.listen(8000, function() {
			//ProxyClient(serverType, edgeClientHostname, edgeServerHostname, targetHost, targetPort, options, agent, edgeClientCerts)

			new ProxyClient("HTTPS", instance.metadata.hostname, instance.metadata.edgeHostname, 'localhost', 8000, undefined, undefined, options);
			console.log("Registered Instance : " + instance.metadata.hostname);
		});

};

var server = new Server();*/
module.exports = { "SampleBeameServer":SampleBeameServer}
//new SampleBeameServer();
