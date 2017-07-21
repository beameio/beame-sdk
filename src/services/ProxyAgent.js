/**
 * Created by Alexz on 20/07/2017.
 */
'use strict';
/**
 * Global proxy settings.
 */
let ProxyAgent = exports;
exports.constructor = function ProxyAgent(){};

let http = require('http');
let https = require('https');
let urlParse = require('url').parse;

let pick = require('lodash/pick');
let assign = require('lodash/assign');
let clone = require('lodash/clone');

const HttpsProxyAgent = require('https-proxy-agent');

let ENV_VAR_PROXY_SEARCH_ORDER = [ 'https_proxy', 'HTTPS_PROXY', 'http_proxy', 'HTTP_PROXY' ];

// save the original settings for restoration later.
let ORIGINALS = {
	http: pick(http, 'globalAgent', 'request'),
	https: pick(https, 'globalAgent', 'request'),
	env: pick(process.env, ENV_VAR_PROXY_SEARCH_ORDER)
};

function resetGlobals() {
	assign(http, ORIGINALS.http);
	assign(https, ORIGINALS.https);
	let val;
	for (let key in ORIGINALS.env) {
		val = ORIGINALS.env[key];
		if (val != null) {
			process.env[key] = val;
		}
	}
}

/**
 * Parses the de facto `http_proxy` environment.
 */
function tryParse(url) {
	if (!url) {
		return null;
	}

	let parsed = urlParse(url);

	return {
		protocol: parsed.protocol,
		host: parsed.hostname,
		port: parseInt(parsed.port, 10),
		proxyAuth: parsed.auth
	};
}


ProxyAgent.isProxying = false;
ProxyAgent.proxyConfig = null;

function findEnvVarProxy() {
	let key, val, result;
	for (let i = 0; i < ENV_VAR_PROXY_SEARCH_ORDER.length; i++) {
		key = ENV_VAR_PROXY_SEARCH_ORDER[i];
		val = process.env[key];
		if (val != null) {
			// get the first non-empty
			result = result || val;
			// delete all
			// NB: we do it here to prevent double proxy handling (and for example path change)
			// by us and the `request` module or other sub-dependencies
			delete process.env[key];
		}
	}
	return result;
}

/**
 * Overrides the node http/https `globalAgent`s to use the configured proxy.
 *
 * If the config is empty, the `http_proxy` environment variable is checked. If
 * that's not present, no proxying will be enabled.
 *
 * @param {object} conf
 * @param {string} [conf.protocol]
 * @param {string} conf.host
 * @param {int} conf.port
 * @param {string} [conf.proxyAuth]
 * @param {object} [conf.httpsOptions]
 * @param {int} [conf.sockets] maximum number of sockets to pool
 * (falsy uses node's default).
 */
ProxyAgent.initialize = function(conf) {
	// don't do anything if already proxying.
	// To change the settings `.end()` should be called first.
	if (ProxyAgent.isProxying) {
		return;
	}

	try {
		// This has an effect of also removing the proxy config
		// from the global env to prevent other modules (like request) doing
		// double handling
		let envVarProxy = findEnvVarProxy();

		if (conf && typeof conf === 'string') {
			// passed string - parse it as a URL
			conf = tryParse(conf);
		} else if (conf) {
			// passed object - take it but clone for future mutations
			conf = clone(conf)
		} else if (envVarProxy) {
			// nothing passed - parse from the env
			conf = tryParse(envVarProxy);
		} else {
			// no config - do nothing
			return;
		}

		if (!conf.host) {
			throw new Error('upstream proxy host is required');
		}
		if (!conf.port) {
			throw new Error('upstream proxy port is required');
		}

		if (conf.protocol === undefined) {
			conf.protocol = 'http:'; // default to proxy speaking http
		}
		if (!/:$/.test(conf.protocol)) {
			conf.protocol = conf.protocol + ':';
		}

		http.globalAgent = ProxyAgent._makeAgent(conf);
		https.globalAgent = ProxyAgent._makeAgent(conf);

		http.request = ProxyAgent._makeRequest(http, 'http');
		https.request = ProxyAgent._makeRequest(https, 'https');

		ProxyAgent.isProxying = true;
		ProxyAgent.proxyConfig = clone(conf);
	} catch (e) {
		resetGlobals();
		throw e;
	}
};

/**
 * Construct an agent
 */
ProxyAgent._makeAgent = function(conf) {
	const proxy = 'http://'+conf.host+':'+conf.port;
	return new HttpsProxyAgent(proxy);
};

/**
 * Override for http.request and https.request, makes sure to default the agent
 * to the global agent.
 * @param {string|object} httpOrHttps http/https request url or options
 * @param {string} [protocol]
 * @private
 */
ProxyAgent._makeRequest = function(httpOrHttps, protocol) {
	return function(options, callback) {
		if (typeof options === 'string') {
			options = urlParse(options);
		} else {
			options = clone(options);
		}
		if(!(options.host.startsWith('127.0.0.1') || options.host.startsWith('localhost'))){
			//force proxy agent on any request
			options.agent = httpOrHttps.globalAgent;
		}

		// set the default port ourselves to prevent Node doing it based on the proxy agent protocol
		if (options.protocol === 'https:' || (!options.protocol && protocol === 'https')) {
			options.port = options.port || 443;
		}
		if (options.protocol === 'http:' || (!options.protocol && protocol === 'http')) {
			options.port = options.port || 80;
		}

		return ORIGINALS[protocol].request.call(httpOrHttps, options, callback);
	};
};

/**
 * Restores global http/https agents.
 */
ProxyAgent.end = function() {
	resetGlobals();
	ProxyAgent.isProxying = false;
	ProxyAgent.proxyConfig = null;
};
