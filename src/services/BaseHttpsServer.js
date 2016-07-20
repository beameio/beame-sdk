'use strict';

var https = require("https");
var ProxyClient = require("./ProxyClient");
var BeameStore = require("./BeameStore");

var _ = require('underscore');
var fs = require('fs');

var beameDirServices = require('./BeameDirServices');
var debug = require("debug")("SampleBeameServer");
var beamestore = new BeameStore();

var SampleBeameServer = function(instanceHostname, usrExpress, hostOnlineCallback)
{
	var edgeCert = beamestore.search(instanceHostname);
	var serverInfo;
	if(edgeCert.length != 1){
		throw new Error("Could not find certificate for " + instanceHostname);
	}
	edgeCert = edgeCert[0];
	var options = {
		key: edgeCert.PRIVATE_KEY,
		cert: edgeCert.P7B,
		ca: edgeCert.CA
	};

	if(usrExpress){
		var xprsApp = https.createServer(options, usrExpress);
		app = xprsApp.listen.apply(xprsApp);
	}
	else {
		app = https.createServer(options);
	}

	app.listen(0, function() {
		function onLocalServerCreated(data){
			if(hostOnlineCallback){
				serverInfo = data;
				hostOnlineCallback(data, app);
				console.error(data);
			}
		};

		var proxy = new ProxyClient("HTTPS", edgeCert.hostname,
									edgeCert.edgeHostname, 'localhost',
									app.address().port, {onLocalServerCreated: onLocalServerCreated},
									undefined, options);
	});
};

module.exports = {SampleBeameServer: SampleBeameServer};
