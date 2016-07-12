'use strict';

var https = require("https");
var ProxyClient = require("./ProxyClient");
var BeameStore = require("./BeameStore");

var _ = require('underscore');
var fs = require('fs');

var beameDirServices = require('./BeameDirServices');
var debug = require("debug")("SampleBeameServer");
var beamestore = new BeameStore();

var SampleBeameServer = function(instanceHostname, hostOnlineCallback)
{
	var edgeCert = beamestore.search(instanceHostname)[0];
	var options = {
		key: edgeCert.PRIVATE_KEY,
		cert: edgeCert.P7B,
		ca: edgeCert.CA
	};

	var app = https.createServer(options);
	app.listen(0, function() {
		var onLocalServerCreated = function(data){
			if(hostOnlineCallback){
				hostOnlineCallback(data, app);
			}
		};

		address = app.address();
		var proxy =new ProxyClient("HTTPS", edgeCert.hostname,
									edgeCert.edgeHostname, 'localhost',
									app.address().port, {"onLocalServerCreated": onLocalServerCreated } ,
									undefined, options);
		});
};

module.exports = { "SampleBeameServer":SampleBeameServer};
