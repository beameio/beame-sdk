'use strict';

/** @namespace BaseHttpsServer */

var fs = require('fs');
const _         = require('underscore');
var https       = require("https");
var ProxyClient = require("./ProxyClient");
var BeameStore  = require("./BeameStoreV2");
var SNIServer   = require("./SNIServer");
var config      = require('../../config/Config');
var logger      = new (require('../utils/Logger'))(config.AppModules.BaseHttpsServer);
var beamestore  = new BeameStore();

/**
 * Starts sample HTTPS server. Either instanceHostname or projectName must be specified.
 * @public
 * @method BaseHttpsServer.SampleBeameServer
 * @param {String|null} [instanceHostname] - fqdn of the HTTPS server. You must have private key of the entity.
 * @param {Function} requestListener - requestListener parameter for https.createServer(), express application for example
 * @param {Function} hostOnlineCallback
 */
var SampleBeameServer = function (instanceHostname, requestListener, hostOnlineCallback) {
	if (!instanceHostname) {
		logger.error('instance hostname or project name required');
		return;
	}


	var fqdn = instanceHostname;

	//could be edge client or routable atom
	var server_entity = beamestore.getCredential(fqdn);

	if (server_entity == null || _.isEmpty(server_entity)) {
		logger.error("Could not find certificate for " + fqdn);
		return;
	}

	/** @type {ServerCertificates} **/
	var serverCerts = {
		key:  server_entity.PRIVATE_KEY,
		cert: server_entity.P7B,
		ca:   server_entity.CA
	};

	var srv = SNIServer.get(config.SNIServerPort, requestListener);
	srv.addFqdn(fqdn, serverCerts);

	// var edgeLocals = beamestore.searchEdgeLocals(host);
	// edgeLocals.forEach(edgeLocal => {
	// 	var edgeLocalData = beamestore.search(edgeLocal.hostname)[0];
	// 	srv.addFqdn(edgeLocalData.hostname, {
	// 		key:  edgeLocalData.PRIVATE_KEY,
	// 		cert: edgeLocalData.P7B,
	// 		ca:   edgeLocalData.CA
	// 	});
	// });

	srv.start(function () {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, srv.getServer());
			}
		}

		var fqdn      = server_entity.getMetadataKey('FQDN'),
		    edge_fqdn = server_entity.getMetadataKey('EDGE_FQDN'),
		    local_ip  = server_entity.getMetadataKey('LOCAL_IP');


		if (!fqdn) {
			logger.fatal('Edge server hostname required');
		}

		if (!edge_fqdn) {
			logger.fatal('Server hostname required');
		}

		if (!local_ip) {
			new ProxyClient("HTTPS", fqdn,
				edge_fqdn, 'localhost',
				srv.getPort(), {onLocalServerCreated: onLocalServerCreated},
				null, serverCerts);
		}
		else {
			onLocalServerCreated(null);
		}

	});
};

module.exports = {SampleBeameServer: SampleBeameServer};
