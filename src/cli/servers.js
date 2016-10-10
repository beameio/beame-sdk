"use strict";

/** @namespace Servers **/


const express = require('express');
const appExpress = express();
// This require is only cause the example is inside the beame-sdk repository, you will be using require('beame-sdk');

const config = require('../../config/Config');
const module_name = config.AppModules.BeameServer;
const BeameLogger = require('../utils/Logger');
const logger = new BeameLogger(module_name);
const path = require('path');
let defaultSharedFolder = path.resolve(__dirname, "../../examples/public/shared");
const defaultPublicDir = path.resolve(__dirname, "../../examples/public");
const beameSDK = new require('../../index.js');


/**
 * run sample chat on given fqdn
 * @public
 * @method Servers.runChatServer
 * @param {String} fqdn
 * @param {String|null} [sharedFolder]
 */

function runChatServer(fqdn, sharedFolder) {

	if (sharedFolder) {
		logger.debug("Custom folder specified");
		defaultSharedFolder = path.normalize(sharedFolder + "/");
	}

	beameSDK.BeameServer(fqdn,  appExpress, function (data, app) {
		if (config.PinAtomPKbyDefault) {
			var pinning = require('./pinning');
			var header = pinning.createPublicKeyPinningHeader(fqdn, true, true);

			appExpress.use(function (req, resp, next) {
				resp.setHeader('Public-Key-Pins', header);
				next();
			});
		}

		//noinspection JSUnresolvedFunction
		appExpress.use(express.static(defaultPublicDir));

		var serveIndex = require('serve-index');

		if (fqdn.indexOf(".l.") > 0)
			logger.info(`Server started on local address: https://${fqdn}:${app.address().port}`);
		else
			logger.info(`Server started on publicly accessible address: https://${fqdn}`);


		appExpress.use('/shared', express.static(defaultSharedFolder));
		appExpress.use('/shared', serveIndex(defaultSharedFolder, {'icons': true}));
		logger.debug(`Server Local Directory ${defaultSharedFolder}`);


		//noinspection JSUnusedLocalSymbols
		app.on("request", function (req, resp) {
			logger.debug("On Request", {hostname: fqdn, method: req.method, url: req.url, headers: req.headers});
		});

		//noinspection JSUnusedLocalSymbols
		app.on("upgrade", function (req, resp) {
			logger.debug("On upgrade", {hostname: fqdn, method: req.method, url: req.url, headers: req.headers});
		});

		var socketio = require('socket.io')(app);
		var chat = require('../../examples/chat/chatserver.js')(socketio);
	});
}

/**
 * Run sample Hello World server on given fqdn
 * @public
 * @method Servers.runHelloWorldServer
 * @param {String} fqdn
 */
function runHelloWorldServer(fqdn) {

	new beameSDK.BeameServer(fqdn, (req, resp) =>{
		resp.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
		resp.end('hello world\n');
		console.log("On beame server request", {
			fqdn: fqdn,
			method: req.method,
			url: req.url,
			headers: req.headers
		});
	},  (data) => {
		logger.info(`Server started on ${fqdn}`);
		logger.debug("BeameServer callback got data", data);
	});
}

module.exports = {
	runHelloWorldServer,
	runChatServer
};
