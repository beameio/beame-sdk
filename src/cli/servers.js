"use strict";

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
 * @param {String} fqdn
 */

function runDemoServer(fqdn, sharedFolder) {

	if (sharedFolder) {
		logger.debug("Custom folder specified");
		defaultSharedFolder = path.normalize(sharedFolder + "/");
	}

	beameSDK.BaseHttpsServer(fqdn,  appExpress, function (data, app) {
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
			logger.info(`\nServer started on local address: \nhttps://${fqdn}:${app.address().port} \n`);
		else
			logger.info(`\nServer started on publicly accessible address: \nhttps://${fqdn} \n`);


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


function runLogginServer(fqdn) {

	new beameSDK.BaseHttpsServer.SampleBeameServer(fqdn,  null, function (data, app) {
		logger.info(`Server started on ${fqdn}`);
		logger.debug("BeameServer callback got data", data);
		app.on("request", function (req, resp) {
			resp.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
			resp.end('hello world\n');
			logger.debug("On beame server request", {
				fqdn: fqdn,
				method: req.method,
				url: req.url,
				headers: req.headers
			});
		});

		var socketio = require('socket.io')(app);
		//noinspection JSUnresolvedFunction
		socketio.set('transports', ['websocket']);

		//noinspection JSUnresolvedFunction
		socketio.on('connection', function (socket) {
			logger.debug("Socketio connection", {fqdn: fqdn});
			socket.emit('iping', {hello: 'world'});
			socket.on('ipong', function () {
				socket.emit('iping', {hello: 'world'});
			});
		});
	});
}

module.exports = {

	runDemoServer	
};
