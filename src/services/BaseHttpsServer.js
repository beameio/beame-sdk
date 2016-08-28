'use strict';

/** @namespace BaseHttpsServer */

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
 * @method BaseHttpsServer.SampleBeameServer
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

	//could be edge client or routable atom
	var server_entity = beamestore.search(host);

	if (server_entity.length != 1) {
		logger.error("Could not find certificate for " + host);
		return;
	}
	server_entity   = server_entity[0];
	/** @type {ServerCertificates} **/
	var serverCerts = {
		key:  server_entity.PRIVATE_KEY,
		cert: server_entity.P7B,
		ca:   server_entity.CA
	};

	var srv = SNIServer.get(config.SNIServerPort, requestListener);
	srv.addFqdn(host, serverCerts);

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
		if (server_entity.level === "edgeclient" || server_entity.level === "remoteclient" || server_entity.level === "atom") {

			if (!server_entity.edgeHostname) {
				logger.fatal('Edge server hostname required');
			}

			if (!server_entity.hostname) {
				logger.fatal('Server hostname required');
			}

			//noinspection JSUnresolvedVariable
			new ProxyClient("HTTPS", server_entity.hostname,
				server_entity.edgeHostname, 'localhost',
				srv.getPort(), {onLocalServerCreated: onLocalServerCreated},
				null, serverCerts);
		}
		else {
			onLocalServerCreated(null);
		}
	});
};

module.exports = {SampleBeameServer: SampleBeameServer};
