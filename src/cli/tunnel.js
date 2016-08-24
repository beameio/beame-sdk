/**
 * Created by USER on 24/08/2016.
 */
"use strict";
var config = require('../../config/Config');
const module_name = config.AppModules.BeameSystem;
var BeameLogger = require('../utils/Logger');
var logger = new BeameLogger(module_name);
var ProxyClient = require("../services/ProxyClient");
var BeameStore  = require("../services/BeameStore");
var beamestore  = new BeameStore();

function httpsTunnel(edgeClientFqdn, localPort) {
	
	//could be edge client or routable atom
	var server_entity = beamestore.search(edgeClientFqdn);
	
	if (server_entity.length != 1) {
		logger.error("Could not find certificate for " + edgeClientFqdn);
		return;
	}
	server_entity            = server_entity[0];
	/** @type {typeof ServerCertificates} **/
	var serverCerts = {
		key:  server_entity.PRIVATE_KEY,
		cert: server_entity.P7B,
		ca:   server_entity.CA
	};
	
	new ProxyClient("HTTPS", edgeClientFqdn,
		server_entity.edgeHostname, 'localhost',
		localPort, {},
		null, serverCerts);
}

module.exports =
{
	httpsTunnel
};
