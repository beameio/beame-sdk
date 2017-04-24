"use strict";

/** @namespace Servers **/


const express    = require('express');
const appExpress = express();
const router     = express.Router();

// This require is only cause the example is inside the beame-sdk repository, you will be using require('beame-sdk');

const config            = require('../../config/Config');
const module_name       = config.AppModules.BeameServer;
const BeameLogger       = require('../utils/Logger');
const logger            = new BeameLogger(module_name);
const path              = require('path');
let defaultSharedFolder = path.resolve(__dirname, "../../examples/public/shared");
const defaultPublicDir  = path.resolve(__dirname, "../../examples/public");
const beameSDK          = new require('../../index.js');


/**
 * run sample chat on given fqdn
 * @public
 * @method Servers.runChatServer
 * @param {String} fqdn
 */

function runChatServer(fqdn) {

	beameSDK.BeameServer(fqdn, appExpress, function (data, app) {
		if (config.PinAtomPKbyDefault) {
			const pinning = require('./pinning');
			let header  = pinning.createPublicKeyPinningHeader(fqdn, true, true);

			appExpress.use(function (req, resp, next) {
				resp.setHeader('Public-Key-Pins', header);
				next();
			});
		}

		//noinspection JSUnresolvedFunction
		appExpress.use(express.static(defaultPublicDir));

		logger.info(`Server started on publicly accessible address: https://${fqdn}`);


		//noinspection JSUnusedLocalSymbols
		app.on("request", function (req, resp) {
			logger.debug("On Request", {_srvFqdn: fqdn, method: req.method, url: req.url, headers: req.headers});
		});

		//noinspection JSUnusedLocalSymbols
		app.on("upgrade", function (req, resp) {
			logger.debug("On upgrade", {_srvFqdn: fqdn, method: req.method, url: req.url, headers: req.headers});
		});

		const socketio = require('socket.io')(app);
		const chat     = require('../../examples/chat/chatserver.js')(socketio);
	});
}

/**
 * Start file static server for sharing files in given folder
 * @param {String} fqdn
 * @param {String|null} [sharedFolder]
 */
function runStaticServer(fqdn, sharedFolder) {

	if (sharedFolder) {
		logger.info(`Custom folder specified on ${sharedFolder}`);
		defaultSharedFolder = path.normalize(sharedFolder + "/");
	}
	const serveIndex = require('serve-index');

	appExpress.use('/', express.static(defaultSharedFolder));
	appExpress.use('/', serveIndex(defaultSharedFolder, {'icons': true}));

	router.get('/', function (req, res) {
		res.sendFile(path.join(__dirname + '/../public/insta-ssl.html'));
	});

	appExpress.use('/', router);


	beameSDK.BeameServer(fqdn, appExpress, () => {

		logger.info(`Server started on publicly accessible address: https://${fqdn}`);
		logger.debug(`Server Local Directory ${defaultSharedFolder}`);
	});
}

/**
 * Run sample Hello World server on given fqdn
 * @public
 * @method Servers.runHelloWorldServer
 * @param {String} fqdn
 */
function runHelloWorldServer(fqdn) {

	new beameSDK.BeameServer(fqdn, (req, resp) => {
		resp.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
		resp.end('hello world\n');
		console.log("On beame server request", {
			fqdn:    fqdn,
			method:  req.method,
			url:     req.url,
			headers: req.headers
		});
	}, (data) => {
		logger.info(`Server started on ${fqdn}`);
		logger.debug("BeameServer callback got data", data);
	});
}

module.exports = {
	runHelloWorldServer,
	runChatServer,
	runStaticServer
};
