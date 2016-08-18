"use strict";
var BeameStore  = require("../services/BeameStore");
var BeameServer = require("../services/BaseHttpsServer").SampleBeameServer;

var beameSDK      = require("../../index.js");
var express       = require('express');
// This require is only cause the example is inside the beame-sdk repository, you will be using require('beame-sdk');

var config        = require('../../config/Config');
const module_name = config.AppModules.BeameServer;
var BeameLogger   = require('../utils/Logger');
var logger        = new BeameLogger(module_name);


function runAtomBeameServer(hostname) {
	beameSDK.BaseHttpsServer.SampleBeameServer(hostname, null, null, function (data, app) {
		//noinspection JSUnresolvedFunction

		logger.info(`Atom server started on https://${hostname} this is a publicly accessible address`);

		app.on("connect",function (req, resp) {
			logger.debug("On connect", {hostname: hostname, method: req.method, url: req.url, headers: req.headers});
		});
		//noinspection JSUnusedLocalSymbols
		app.on("request", function (req, resp) {
			logger.debug("On Request", {hostname: hostname, method: req.method, url: req.url, headers: req.headers});
		});

		//noinspection JSUnusedLocalSymbols
		app.on("upgrade", function (req, resp) {
			logger.debug("On upgrade", {hostname: hostname, method: req.method, url: req.url, headers: req.headers});
		});

	});
}

var startAtomBeameNode = function (atomFqdn) {
	runAtomBeameServer(atomFqdn);
};


module.exports = {
	startAtomBeameNode:
	startAtomBeameNode
};
