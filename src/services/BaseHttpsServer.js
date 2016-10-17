/**
 * Created by zenit1 on 17/10/2016.
 */
'use strict';

/** @namespace BaseHttpsServer */

const fs          = require('fs');
const _           = require('underscore');
const https       = require("https");
const ProxyClient = require("./ProxyClient");
const SNIServer   = require("./SNIServer");
const config      = require('../../config/Config');
const logger      = new (require('../utils/Logger'))(config.AppModules.BaseHttpsServer);



/**
 * Starts sample HTTPS server. Either instanceHostname or projectName must be specified.
 * @public
 * @method BaseHttpsServer.BaseBeameHttpsServer
 * @param {String|null} [fqdn] - fqdn of the HTTPS server. You must have private key of the entity.
 * @param {Function} requestListener - requestListener parameter for https.createServer(), express application for example
 * @param {Function} hostOnlineCallback
 */
function BaseBeameHttpsServer(fqdn, requestListener, hostOnlineCallback) {

	const beamestore = new (require("./BeameStoreV2"))();

	//could be edge client or routable atom
	var server_entity = beamestore.getCredential(fqdn);

	if (!server_entity) {
		logger.error(`Could not find certificate for ${fqdn}`);
		return;
	}

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
}

module.exports = {BaseBeameHttpsServer};
