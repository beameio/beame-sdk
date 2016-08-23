var creds = require("../../src/cli/servers");
var remoteClientServices = new (require('../../src/core/RemoteClientServices'))();
var BeameLogger = require('../../src/utils/Logger');
var config        = require('../../config/Config');
const module_name = config.AppModules.BeameSDKlauncher;
var logger        = new BeameLogger(module_name);
remoteClientServices.createEdgeClient(function(error, message){
	if(!error){
		var hostname = message.hostname;
		logger.info(`Registered new routable host: ${hostname} starting socketio chat`);
		creds.launchChat(hostname);
	}
}, null, null);