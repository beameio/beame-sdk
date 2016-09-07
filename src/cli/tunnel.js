/**
 * Created by USER on 24/08/2016.
 */
"use strict";
const config        = require('../../config/Config');
const module_name = config.AppModules.Tunnel;
const BeameLogger   = require('../utils/Logger');
const logger        = new BeameLogger(module_name);
const ProxyClient   = require("../services/ProxyClient");
const BeameStore    = require("../services/BeameStoreV2");
const beamestore    = new BeameStore();

/**
 * @param {Object} certs
 * @param {String} targetHost
 * @param {Number} targetPort
 * @returns {Promise}
 */
function startHttpsTerminatingProxy(certs, targetHost, targetPort) {
	// certs - key, cert, ca
	return new Promise((resolve, reject) => {
		var httpProxy = require('http-proxy');
		const proxy = httpProxy.createProxyServer({
			target: {
				host: targetHost,
				port: targetPort
			},
			ssl: {
				key:  certs.key,
				cert: certs.cert,
			}
		});
		proxy.listen(0, () => {
			// console.log(proxy._server.address().port);
			resolve(proxy._server.address().port);
		});
	});
}

/**
 * @param {String} fqdn
 * @param {String} targetHost
 * @param {Number} targetPort
 * @param {String} targetProto
 */
function httpsTunnel(fqdn, targetHost, targetPort, targetProto) {

	if(targetProto != 'http' && targetProto != 'https') {
		throw new Error("httpsTunnel: targetProto must be either http or https");
	}

	//could be edge client or routable atom
	var server_entity = beamestore.search(fqdn);

	if (server_entity.length != 1) {
		logger.fatal(`Could not find entity ${fqdn}`);
	}

	server_entity   = server_entity[0];

	if(!server_entity.fqdn){
		logger.fatal(`FQDN missing for ${fqdn}`);
	}

	/** @type {typeof ServerCertificates} **/
	var serverCerts = {
		key:  server_entity.PRIVATE_KEY,
		cert: server_entity.P7B,
		ca:   server_entity.CA
	};

	if(targetProto == 'http') {
		startHttpsTerminatingProxy(serverCerts, targetHost, targetPort)
			.then(terminatingProxyPort => {
				// console.log('PORT', terminatingProxyPort);
				new ProxyClient("HTTPS", fqdn,
					server_entity.fqdn, 'localhost',
					terminatingProxyPort, {},
					null, serverCerts);
			})
			.catch(e => {
				throw new Error(`Error starting HTTPS terminaring proxy: ${e}`);
			})
	} else {

		new ProxyClient("HTTPS", fqdn,
			server_entity.fqdn, targetHost,
			targetPort, {},
			null, serverCerts);
	}
}

module.exports =
{
	httpsTunnel
};
