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
 * @param {String|null} [instanceFqdn] - fqdn of the HTTPS server. You must have private key of the entity.
 * @param {Function} requestListener - requestListener parameter for https.createServer(), express application for example
 * @param {Function} hostOnlineCallback
 * @param {Function|null} [errorCallback]
 */
function BeameServer(instanceFqdn, requestListener, hostOnlineCallback, errorCallback) {

	const beamestore = new (require("./BeameStoreV2"))();

	/**
	 * @param {String} msg
	 * @private
	 */
	const __onError = (msg) => {
		if (errorCallback) {
			errorCallback(msg);
		}
		else {
			logger.fatal(msg);
		}
	};

	if (!instanceFqdn) {
		return __onError('instance hostname or project name required');
	}

	let fqdn = instanceFqdn;

	//noinspection JSDeprecatedSymbols
	let cred = beamestore.getCredential(fqdn);

	if (cred == null || _.isEmpty(cred)) {
		return __onError(`Could not find certificate for ${fqdn}`);
	}

	let srv = SNIServer.get(config.SNIServerPort);

	let certs = null;

	try {
		certs = cred.getHttpsServerOptions();
	}
	catch (error) {
		return __onError(error)
	}

	srv.addFqdn(fqdn, certs, requestListener);

	srv.start(function () {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, srv.getServer());
			}
		}

		let fqdn      = cred.getKey('FQDN');

		if (!fqdn) {
			return __onError('Server hostname required');
		}


		let proxyClient = new ProxyClient("HTTPS", cred, 'localhost',
				srv.getPort(), {onLocalServerCreated: onLocalServerCreated},
				null, certs);

		proxyClient.start();
	});
}

module.exports = BeameServer;
