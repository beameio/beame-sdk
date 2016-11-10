/**
 * Created by zenit1 on 17/10/2016.
 */
'use strict';

/** @namespace BaseHttpsServer */

const fs          = require('fs');
const https       = require("https");
const ProxyClient = require("./ProxyClient");
const config      = require('../../config/Config');
const logger      = new (require('../utils/Logger'))(config.AppModules.BaseHttpsServer);


/**
 * Starts sample HTTPS server. Either instanceHostname or projectName must be specified.
 * @public
 * @method BaseHttpsServer.BaseBeameHttpsServer
 * @param {String} fqdn - fqdn of the HTTPS server. You must have private key of the entity.
 * @param {Function} requestListener - requestListener parameter for https.createServer(), express application for example
 * @param {Function|null} [hostOnlineCallback]
 * @param {Function|null} [errorCallback]
 * @param {Object|null} [options]
 */
function BaseBeameHttpsServer(fqdn, options, requestListener, hostOnlineCallback, errorCallback) {

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

	let cred = beamestore.getCredential(fqdn);

	if (!cred) {
		return __onError(`Could not find certificate for ${fqdn}`);
	}

	let edge_fqdn = cred.getMetadataKey('EDGE_FQDN');

	if (!edge_fqdn) {
		return __onError('Edge server hostname required');
	}

	let certs = null;

	try {
		certs = cred.getHttpsServerOptions();
	}
	catch (error) {
		return __onError(error)
	}

	var serverOptions = Object.assign({}, options || {}, certs);

	var server = https.createServer(serverOptions, requestListener);

	server.listen(0, ()=> {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, server);
			}
		}

		//noinspection JSUnresolvedVariable
		new ProxyClient("HTTPS", fqdn,
			edge_fqdn, 'localhost',
			server.address().port, {onLocalServerCreated: onLocalServerCreated},
			null, serverOptions);
	});
}

module.exports = BaseBeameHttpsServer;
