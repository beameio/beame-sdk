/**
 * Created by zenit1 on 17/10/2016.
 */
'use strict';

/** @namespace BaseHttpsServer */

const fs          = require('fs');
const https       = require("https");
const ProxyClient = require("./ProxyClient");
const SNIServer   = require("./SNIServer");
const config      = require('../../config/Config');
const logger      = new (require('../utils/Logger'))(config.AppModules.BaseHttpsServer);


/**
 * Starts sample HTTPS server. Either instanceHostname or projectName must be specified.
 * @public
 * @method BaseHttpsServer.BaseBeameHttpsServer
 * @param {String} fqdn - fqdn of the HTTPS server. You must have private key of the entity.
 * @param {Function} requestListener - requestListener parameter for https.createServer(), express application for example
 * @param {Function|null} [hostOnlineCallback]
 * @param {Object|null} [options]
 */
function BaseBeameHttpsServer(fqdn, options, requestListener, hostOnlineCallback) {

	const beamestore = new (require("./BeameStoreV2"))();

	//could be edge client or routable atom
	var server_entity = beamestore.getCredential(fqdn);

	if (!server_entity) {
		logger.fatal(`Could not find certificate for ${fqdn}`);
	}

	if (!server_entity.edge_fqdn) {
		logger.fatal(`edge server not defined for ${fqdn}`);
	}

	var o = options || {};

	o.key  = server_entity.PRIVATE_KEY;
	o.cert = server_entity.P7B;
	o.ca   = server_entity.CA;

	var app = https.createServer(o, requestListener);

	app.listen(0, function (options) {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, app);
			}
		}

		//noinspection JSUnresolvedVariable
		new ProxyClient("HTTPS", fqdn,
			edgeCert.edge_fqdn, 'localhost',
			app.address().port, {onLocalServerCreated: onLocalServerCreated},
			null, options);
	}.bind(null, o));
}

module.exports = BaseBeameHttpsServer;
