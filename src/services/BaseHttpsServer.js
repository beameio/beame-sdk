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
	var options = {
		key:  server_entity.PRIVATE_KEY,
		cert: server_entity.P7B,
		ca:   server_entity.CA
	};

	var app = https.createServer(options, requestListener);

	app.listen(0, function (options) {
		function onLocalServerCreated(data) {
			if (hostOnlineCallback) {
				hostOnlineCallback(data, app);
			}
		}

		//noinspection JSUnresolvedVariable
		new ProxyClient("HTTPS", fqdn,
			edgeCert.edgeHostname, 'localhost',
			app.address().port, {onLocalServerCreated: onLocalServerCreated},
			undefined, options);
	}.bind(null, options));
}

module.exports = {BaseBeameHttpsServer};
