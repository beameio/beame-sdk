'use strict';
var fs = require('fs');

var https       = require("https");
var ProxyClient = require("./ProxyClient");
var BeameStore  = require("./BeameStore");


var debug      = require("debug")("SampleBeameServer");
var beamestore = new BeameStore();

/**
 *
 * @param {String|null|undefined} [instanceHostname]
 * @param {String|null|undefined} [projectName]
 * @param {Function} requestListener
 * @param {Function} hostOnlineCallback
 * @constructor
 */
var SampleBeameServer = function (instanceHostname, projectName, requestListener, hostOnlineCallback) {
	if (!instanceHostname && !projectName) {
		throw new Error('instance hostname or project name required');
	}


	var host;
	if (instanceHostname == null) {
		var varName = projectName;
		host        = process.env[varName];
		if (host == undefined) {
			console.error("Error: environment variable <" + varName + "> undefined, store project hostname in environment and rerun");
			process.exit(1);
		}
	}
	else {
		host = instanceHostname;
	}
	var edgeCert = beamestore.search(host);
	if (edgeCert.length != 1) {
		throw new Error("Could not find certificate for " + host);
	}
	edgeCert    = edgeCert[0];
	var options = {
		key:  edgeCert.PRIVATE_KEY,
		cert: edgeCert.P7B,
		ca:   edgeCert.CA
	};

	var app = https.createServer(options, requestListener);

	app.listen(0, function (options) {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, app);
			}
		}

		//noinspection JSUnresolvedVariable
		new ProxyClient("HTTPS", edgeCert.hostname,
			edgeCert.edgeHostname, 'localhost',
			app.address().port, {onLocalServerCreated: onLocalServerCreated},
			undefined, options);
	}.bind(null, options));
};

module.exports = {SampleBeameServer: SampleBeameServer};
