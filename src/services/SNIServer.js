'use strict';

const https   = require('https');
const tls     = require('tls');
const config  = require('../../config/Config');
const logger  = new (require('../utils/Logger'))(config.AppModules.SNIServer);
const servers = {};

const portRegex = /:.*/;

class SNIServer {

	// TODO: static method SNIServer.something instead of getSNIServer function below

	constructor(port, requestListener) {
		this.port            = port;
		this.hosts           = {};
		this.requestListener = requestListener || this.requestHandler.bind(this);
		this.server          = null;
		this.started         = false;
	}

	//noinspection JSUnusedGlobalSymbols
	start(callback) {
		if (this.started) {
			callback();
			return;
		}
		this.server = https.createServer({
			SNICallback: this.SNICallback.bind(this)
		}, this.requestListener);

		this.server.listen(this.port, callback);

		for (let host in this.hosts) {
			//noinspection JSUnfilteredForInLoop
			logger.info(`starting server on ${host}`);
		}

		this.started = true;
	}

	getServer() {
		return this.server;
	};

	getPort() {
		return this.server.address().port;
	};

	addFqdn(fqdn, certs, listener) {
		if (!this.hosts[fqdn]) {
			this.hosts[fqdn] = {};
		}
		this.hosts[fqdn].certs = certs;
		if (listener) {
			this.addListener(fqdn, listener);
		}
	}

	requestHandler(req, res) {
		let host = req.headers.host.replace(portRegex, '');
		if (!this.hosts[host]) {
			return null;
		}
		return this.hosts[host].listener(req, res);
	}

	addListener(fqdn, listener) {
		if (!this.hosts[fqdn]) {
			this.hosts[fqdn] = {};
		}
		this.hosts[fqdn].listener = listener;
	}

	getSecureContext(servername) {
		if (!this.hosts[servername]) {
			logger.error(`SNIServer.getSecureContext: Host ${servername} is unknown`);
			return null;
		}
		if (!this.hosts[servername].secureContext) {
			this.hosts[servername].secureContext = tls.createSecureContext(this.hosts[servername].certs);
		}
		return this.hosts[servername].secureContext;
	}

	SNICallback(servername, cb) {
		if (!this.hosts[servername]) {
			cb(`Host ${servername} is unknown`, null);
			return;
		}
		cb(null, this.getSecureContext(servername));
	}

	static get(port, requestListener) {
		if (!servers[port]) {
			servers[port] = new SNIServer(port, requestListener);
		}
		return servers[port];
	}
}

module.exports = SNIServer;
