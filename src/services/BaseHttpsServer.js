'use strict';
var fs = require('fs');

var https       = require("https");
var ProxyClient = require("./ProxyClient");
var BeameStore  = require("./BeameStore");
var SNIServer   = require("./SNIServer");
var config      = require('../../config/Config');


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
	edgeCert            = edgeCert[0];
	/** @type {typeof ServerCertificates} **/
	var edgeClientCerts = {
		key:  edgeCert.PRIVATE_KEY,
		cert: edgeCert.P7B,
		ca:   edgeCert.CA
	};

	var srv = SNIServer.getSNIServer(config.SNIServerPort, requestListener);
	srv.addFqdn(host, edgeClientCerts);

	var edgeLocals = beamestore.searchEdgeLocals(host);
	edgeLocals.forEach(edgeLocal => {
		var edgeLocalData = beamestore.search(edgeLocal.hostname)[0];
		srv.addFqdn(edgeLocalData.hostname, {
			key:  edgeLocalData.PRIVATE_KEY,
			cert: edgeLocalData.P7B,
			ca:   edgeLocalData.CA
		});
	});

	srv.start(function () {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, srv.getServer());
			}
		}

		//noinspection JSUnresolvedVariable
		if(edgeCert.hostname.indexOf(".r.")>0){
			new ProxyClient("HTTPS", edgeCert.hostname,
				edgeCert.edgeHostname, 'localhost',
				srv.getPort(), {onLocalServerCreated: onLocalServerCreated},
				null, edgeClientCerts);
		}
		else{
			onLocalServerCreated(null);
		}
	});
};

module.exports = {SampleBeameServer: SampleBeameServer};
