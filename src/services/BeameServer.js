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
 * @method BaseHttpsServer.SampleBeameServer
 * @param {String|null} [instanceHostname] - fqdn of the HTTPS server. You must have private key of the entity.
 * @param {Function} requestListener - requestListener parameter for https.createServer(), express application for example
 * @param {Function} hostOnlineCallback
 */
function BeameServer(instanceHostname, requestListener, hostOnlineCallback) {

	const beamestore = new (require("./BeameStoreV2"))();

	if (!instanceHostname) {
		logger.error('instance hostname or project name required');
		return;
	}


	let fqdn = instanceHostname;

	//could be edge client or routable atom
	let server_entity = beamestore.getCredential(fqdn);

	if (server_entity == null || _.isEmpty(server_entity)) {
		logger.error("Could not find certificate for " + fqdn);
		return;
	}

	/** @type {ServerCertificates} **/
	let serverCerts = {
		key:  server_entity.PRIVATE_KEY,
		cert: server_entity.P7B,
		ca:   server_entity.CA
	};

	let srv = SNIServer.get(config.SNIServerPort, requestListener);
	srv.addFqdn(fqdn, serverCerts);

	srv.start(function () {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, srv.getServer());
			}
		}

		let fqdn      = server_entity.getKey('FQDN'),
		    local_ip  = server_entity.getMetadataKey('LOCAL_IP'),
		    edge_fqdn = server_entity.getMetadataKey('EDGE_FQDN');

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
}

module.exports = BeameServer;
