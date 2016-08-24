var config        = require('../../config/Config');
if(config.InitFirstRemoteEdgeClient){
	var servers = require("../../src/cli/servers");
	var creds = require("../../src/cli/creds");

	var atoms         = creds.list("atom", "", "JSON");
	var edgeclients   = creds.list("edgeclient", "", "JSON");
	var remoteclients = creds.list("remoteclient", "", "JSON");
	if ((remoteclients.length > 0) || (atoms.length > 0) || (edgeclients.length > 0)){
		console.log('beame credentials found, initializing FIRST client aborted');
	}
	else{
		var remoteClientServices = new (require('../../src/core/RemoteClientServices'))();
		var BeameLogger = require('../../src/utils/Logger');

		const module_name = config.AppModules.BeameSDKlauncher;
		var logger        = new BeameLogger(module_name);
		remoteClientServices.createEdgeClient(function(error, message){
			if(!error){
				var hostname = message.hostname;
				logger.info(`Registered new routable host: ${hostname} starting socketio chat`);
				console.log("\n\n");
				console.log("                                              /^^^^^^^\\");
				console.log("                                     /=========================\\");
				console.log("                    /************************************************************\\");
				console.log("              /**********Bbbb   EEEEE     A******M       M  EEEEE ***<^^>*** ooo *******\\");
				console.log("         /***************B   B  E        A A*****M*M   M*M  E    ********* oo   oo ***********\\");
				console.log("     <==@@@@*************B==B   EEEE    A   A****M   M   M  EEEE ****i  i oo     oo *******@@@@==>");
				console.log("             \\***********B    B*E      AAAAAAA***M       M  E    ****i  i* oo   oo ******/");
				console.log("              \\**********Bbbbb  EEEEE*A       A**M       M**EEEEE*@**i_ i*** ooo *******/");
				console.log("                    \\************************************************************/");
				console.log("                                         \\=================/");
				console.log("                                              \\@@@@@@@/");
				console.log("\n\n<@$@>\n");
/*				var busy = false;
				var safeCounter = 10;
				var runMyChat = setInterval(function () {
					if(!busy){
						busy = true;
						if(--safeCounter < 1)clearInterval(runMyChat);
						try {*/
							servers.launchChat(hostname);
/*							clearInterval(runMyChat);
						}
						catch(e){
							busy = false;
							console.log('.x.x.x.x.x');
						}
					}
				},500);*/
			}
		}, null, null);
	}
}
