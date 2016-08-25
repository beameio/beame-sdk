"use strict";
var BeameStore = require("../services/BeameStore");
var BeameServer = require("../services/BaseHttpsServer").SampleBeameServer;

var beameSDK = require("../../index.js");
var express = require('express');
var appExpress = express();
// This require is only cause the example is inside the beame-sdk repository, you will be using require('beame-sdk');
var creds = beameSDK.creds;
var developers = beameSDK.creds.list("developer", "", "JSON");
var atoms = beameSDK.creds.list("atom", "", "JSON");
var edgeclients = beameSDK.creds.list("edgeclient", "", "JSON");

var config = require('../../config/Config');
const module_name = config.AppModules.BeameServer;
var BeameLogger = require('../utils/Logger');
var logger = new BeameLogger(module_name);

var path = require('path');
var defaultSharedFolder = path.resolve(__dirname, "../../examples/public/shared");
var defaultPublicDir = path.resolve(__dirname, "../../examples/public");

/**
 * run sample chat on given fqdn
 * @param {String} hostname
 */
function runSampleChat(hostname) {
	beameSDK.BaseHttpsServer.SampleBeameServer(hostname, null, appExpress, function (data, app) {
		var fqdn = hostname;
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
		
		if (hostname.indexOf(".l.") > 0)
			logger.info(`\nServer started on local address: \nhttps://${hostname}:${app.address().port} \n`);
		else
			logger.info(`\nServer started on publicly accessible address: \nhttps://${hostname} \n`);
		
		
		appExpress.use('/shared', express.static(defaultSharedFolder));
		appExpress.use('/shared', serveIndex(defaultSharedFolder, {'icons': true}));
		logger.debug(`Server Local Directory ${defaultSharedFolder}`);
		
		
		//noinspection JSUnusedLocalSymbols
		app.on("request", function (req, resp) {
			logger.debug("On Request", {hostname: hostname, method: req.method, url: req.url, headers: req.headers});
		});
		
		//noinspection JSUnusedLocalSymbols
		app.on("upgrade", function (req, resp) {
			logger.debug("On upgrade", {hostname: hostname, method: req.method, url: req.url, headers: req.headers});
		});
		
		var socketio = require('socket.io')(app);
		var chat = require('../../examples/chat/chatserver.js')(socketio);
	});
}


function launchHelloWorldServer(edgeClientFqdn) {
	
	new BeameServer(edgeClientFqdn, null, null, function (data, app) {
		logger.info(`Server started on ${edgeClientFqdn}`);
		logger.debug("BeameServer callback got data", data);
		app.on("request", function (req, resp) {
			resp.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
			resp.end('hello world\n');
			logger.debug("On beame server request", {
				fqdn: edgeClientFqdn,
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
			logger.debug("Socketio connection", {fqdn: edgeClientFqdn});
			socket.emit('iping', {hello: 'world'});
			socket.on('ipong', function () {
				socket.emit('iping', {hello: 'world'});
			});
		});
	});
}

/**
 * launch chat server on given fqdn
 * @param {String} edgeClientFqdn
 * @param {String} [sharedFolder]
 */
function launchChat(edgeClientFqdn, sharedFolder) {
	if (sharedFolder) {
		logger.debug("Custom folder specified");
		defaultSharedFolder = path.normalize(sharedFolder + "/");
	}
	runSampleChat(edgeClientFqdn);
}

/**
 * create developer hierarchy atom/edge client , if not exists, and launch chat server first edge client
 * @param {String} [sharedFolder]
 */
function launchFirstChat(sharedFolder) {
	
	if (sharedFolder) {
		logger.debug("Custom folder specified");
		defaultSharedFolder = path.normalize(sharedFolder + "/");
	}
	
	if (developers.length == 0) {
		logger.error("You don't have developer credentials in your .beame folder, please go to ");
		logger.error(" https://registration.beameio.net and register with your email ");
		logger.error("it will contain a command that looks like 'beame creds createDeveloper ......");
		logger.fatal("Please run that command and then relaunch the example ");
	}
	
	if (edgeclients.length > 0) {
		logger.info("You have edgeclient ready to go starting ....");
		runSampleChat(edgeclients[0].hostname);
		return;
	}
	
	var createEdgeClient = function (atom_fqdn) {
		beameSDK.creds.createEdgeClient(atom_fqdn, function (error, edgeData) {
			if (error) {
				logger.fatal(error.message, error.data, config.AppModules.EdgeClient);
			}
			
			var edgeHostname = edgeData.hostname;
			logger.info(`Congrats! My new hostname is: https://${edgeHostname}`);
			runSampleChat(edgeHostname);
		});
	};
	
	if (atoms.length == 0 && edgeclients.length == 0 && developers.length > 0) {
		logger.info("You have developer credentials now we will set up an Atom SSL cert, and  edgeClient cert ");
		logger.info("It will take about 30 seconds, please wait patiently, yes we understand..., it will be much faster soon (:- ");
		var devHostname = developers[0].hostname;
		beameSDK.creds.createAtom(devHostname, "BeameNodeXXX", function (error, data) {
			if (error) {
				logger.fatal(error.message, error.data, config.AppModules.Atom);
			}
			
			logger.info(`Just created atom with host:${data.hostname}`);
			createEdgeClient(data.hostname);
		});
	}
	
	if (atoms.length > 0 && edgeclients.length === 0) {
		logger.info(`You already have atom credentials your atom hostname is ${atoms[0].hostname}`);
		logger.info("All we need to do is to create the webserver aka edgeCert for the demo, about 30 seconds, yes its slow, but not for long");
		
		createEdgeClient(atoms[0].hostname);
	}
}

function runShell(path2Script,fqdn) {
	
	var beameStore    = new (require('../../src/services/BeameStore'))();
	
	var entity = beameStore.search(fqdn)[0];
	if(!entity)
		logger.fatal('fqdn folder not found');
	
	var path2Pfx = path.join(entity.path ,config.CertFileNames.PKCS12);
	var path2Pwd = path.join(entity.path ,config.CertFileNames.PWD);
		
	var exec = require("child_process").execFile, child;
	//
	// var script = `"${path.resolve(__dirname, path2Script )} -$pathToPfx  ${path2Pfx}  -$pathToPfxPwd ${path2Pwd}  \"Default Web Site\""`;
	// console.log(script);
	
	
	var args = [path.resolve(__dirname, path2Script ),path2Pfx,path2Pwd,'local.lfe.com',fqdn];
	var cmd = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -ArgumentList '-ExecutionPolicy RemoteSigned -File \"%1\"' -Verb RunAs";

	console.log(`args ${args}`);

	
	exec(cmd,args, (error, stdout, stderr) => {
		if (stderr) {
			console.error('stderr', stderr);
			throw error;
		}
		
		console.log('finished....',stdout);
	});
	
	// var creds = require('../../src/cli/tunnel');
	//
	// creds.httpsTunnel(fqdn,443);
}

module.exports = {
	launchHelloWorldServer,
	launchFirstChat,
	launchChat,
	runShell
};
