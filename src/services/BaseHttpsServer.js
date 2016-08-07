'use strict';
var fs = require('fs');

var https       = require("https");
var ProxyClient = require("./ProxyClient");
var BeameStore  = require("./BeameStore");
var SNIServer   = require("./SNIServer");
var config      = require('../../config/Config');
var _logger     = new (require('../utils/Logger'))(config.AppModules.BaseHttpsServer);
var beamestore  = new BeameStore();

/**
 *
 * @param {String|null|undefined} [instanceHostname]
 * @param {String|null|undefined} [projectName]
 * @param {Function} requestListener
 * @param {Function} hostOnlineCallback
 * @constructor
 */
var SampleBeameServer = function (instanceHostname, projectName, requestListener, hostOnlineCallback) {
	if (!instanceHostname && !projectName) {
		_logger.error('instance hostname or project name required');
		return;
	}


	var host;
	if (instanceHostname == null) {
		var varName = projectName;
		host        = process.env[varName];
		if (host == undefined) {
			_logger.error("Error: environment variable <" + varName + "> undefined, store project hostname in environment and rerun");
			return;
		}
	}
	else {
		host = instanceHostname;
	}

	var edgeCert = beamestore.search(host);

	if (edgeCert.length != 1) {
		_logger.error("Could not find certificate for " + host);
		return;
	}
	edgeCert            = edgeCert[0];
	/** @type {typeof ServerCertificates} **/
	var edgeClientCerts = {
		key:  edgeCert.PRIVATE_KEY,
		cert: edgeCert.P7B,
		ca:   edgeCert.CA
	};

	var srv = SNIServer.get(config.SNIServerPort, requestListener);
	srv.addFqdn(host, edgeClientCerts);

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
		if (edgeCert.hostname.indexOf(".r.") > 0) {
			new ProxyClient("HTTPS", edgeCert.hostname,
				edgeCert.edgeHostname, 'localhost',
				srv.getPort(), {onLocalServerCreated: onLocalServerCreated},
				null, edgeClientCerts);
		}
		else {
			onLocalServerCreated(null);
		}
	});
};

module.exports = {SampleBeameServer: SampleBeameServer};
