'use strict';

var fs = require('fs');

var https       = require("https");
var ProxyClient = require("./ProxyClient");
var BeameStore  = require("./BeameStore");
var SNIServer   = require("./SNIServer");
var config      = require('../../config/Config');
var logger      = new (require('../utils/Logger'))(config.AppModules.BaseHttpsServer);
var beamestore  = new BeameStore();

/**
 * Starts sample HTTPS server. Either instanceHostname or projectName must be specified.
 * @public
 * @method SampleBeameServer
 * @param {String|null} [instanceHostname] - fqdn of the HTTPS server. You must have private key of the entity.
 * @param {String|null} [projectName] - name of environment variable to get fqdn from.
 * @param {Function} requestListener - requestListener parameter for https.createServer(), express application for example
 * @param {Function} hostOnlineCallback
 */
var SampleBeameServer = function (instanceHostname, projectName, requestListener, hostOnlineCallback) {
	if (!instanceHostname && !projectName) {
		logger.error('instance hostname or project name required');
		return;
	}


	var host;
	if (instanceHostname == null) {
		var varName = projectName;
		host        = process.env[varName];
		if (host == undefined) {
			logger.error("Error: environment variable <" + varName + "> undefined, store project hostname in environment and rerun");
			return;
		}
	}
	else {
		host = instanceHostname;
	}

	var edgeCert = beamestore.search(host);

	if (edgeCert.length != 1) {
		logger.error("Could not find certificate for " + host);
		return;
	}
	edgeCert            = edgeCert[0];
	/** @type {typeof ServerCertificates} **/
	var edgeClientCerts = {
		key:  edgeCert.PRIVATE_KEY,
		cert: edgeCert.P7B,
		ca:   edgeCert.CA
	};

	var srv = SNIServer.get(config.SNIServerPort, requestListener);
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
		if (edgeCert.hostname.indexOf(".r.") > 0) {
			new ProxyClient("HTTPS", edgeCert.hostname,
				edgeCert.edgeHostname, 'localhost',
				srv.getPort(), {onLocalServerCreated: onLocalServerCreated},
				null, edgeClientCerts);
		}
		else {
			onLocalServerCreated(null);
		}
	});
};

module.exports = {SampleBeameServer: SampleBeameServer};
