/**
 * Created by USER on 24/08/2016.
 */
"use strict";
var config        = require('../../config/Config');
const module_name = config.AppModules.Tunnel;
var BeameLogger   = require('../utils/Logger');
var logger        = new BeameLogger(module_name);
var ProxyClient   = require("../services/ProxyClient");
var BeameStore    = require("../services/BeameStore");
var beamestore    = new BeameStore();

/**
 * @param {String} fqdn
 * @param {Number} targetPort
 * @param {String|null} [targetHost] => default localhost
 */
function httpsTunnel(fqdn, targetHost, targetPort, targetProto) {

	//could be edge client or routable atom
	var server_entity = beamestore.search(fqdn);

	if (server_entity.length != 1) {
		logger.fatal(`Could not find entity ${fqdn}`);
	}

	server_entity   = server_entity[0];

	if(!server_entity.edgeHostname){
		logger.fatal(`Edge hostname missing for ${fqdn}`);
	}

	/** @type {typeof ServerCertificates} **/
	var serverCerts = {
		key:  server_entity.PRIVATE_KEY,
		cert: server_entity.P7B,
		ca:   server_entity.CA
	};

	new ProxyClient("HTTPS", fqdn,
		server_entity.edgeHostname, targetHost || 'localhost',
		targetPort, {},
		null, serverCerts);
}

module.exports =
{
	httpsTunnel
};
