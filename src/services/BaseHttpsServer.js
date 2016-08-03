'use strict';
var fs = require('fs');

var https       = require("https");
var ProxyClient = require("./ProxyClient");
var BeameStore  = require("./BeameStore");

var SNIServer  = require("./SNIServer");


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
	var edgeClientCerts = {
		key:  edgeCert.PRIVATE_KEY,
		cert: edgeCert.P7B,
		ca:   edgeCert.CA
	};

	var srv = SNIServer.getSNIServer(process.env.PORT || 8443, requestListener);
	srv.addFqdn(host, edgeClientCerts);

	srv.start(function () {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, srv.getServer());
			}
		}

		//noinspection JSUnresolvedVariable
		new ProxyClient("HTTPS", edgeCert.hostname,
			edgeCert.edgeHostname, 'localhost',
			srv.getPort(), {onLocalServerCreated: onLocalServerCreated},
			null, edgeClientCerts);
	});
};

module.exports = {SampleBeameServer: SampleBeameServer};
