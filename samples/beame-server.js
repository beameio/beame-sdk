var beame-api = require("@beameio/beame-api");
var _ = requrie("underscore");
var debug = require("debug")("beameTestServer");

var BeameSever = function(serverCertificate){
	
}

function startServer(appName, numberOfHosts, devName){

	var beameServer = new BeameSever();
	beameServer.findInstanceCertificates( function(devCerts){ 
		{ 
			[ 
			{"devname": "devname",
				"devPrivateKey": "key",
				"devCert": "cert",
				"hostname": "",
				"apps": [
				{
					"appname": "name",
					"appkey": "key", //		 
					"appcert": "cert",
					"instances":[
					{
						hostname: "name",
						cert: "",
						key:  "";
					}
					]
				},
				]
			}
			]
		}	
		//
		// Validate input, check the the developer is either selected or there is only one
		//


		var selectedDeveloper = undefined;
		var selectedApp = undefined;

		if(devCerts ||	devCerts.length == 0){
			console.warn("No developer certs present please run npm beameInit");
			process.exit(0);
		}
		
		if(devCerts.length() != 1 && devName.length() == 0){
			console.warn("There are multiple developers under ~./beame please select one");
			process.exit(0);
		}

		if(devCerts.length() > 1 &&  devName.length() > 0 ){
			selectedDeveloper = _.find(devCerts, function(dev) { 
				dev.devname && return ~0;
				if(dev.devname === devName){
					return 0;
				}
			}
		}

		if(devCerts.length() == 1){
			selectedDeveloper = devCerts[0];
		}
		
		if(selectedDeveloper){
			if(selectedDeveloper.apps)

		}
		else{
			return -1;
		}
		///
		// check the the selected developers have apps.
		///
		//

		





			var selectedApp = _.find(selectedDeveloper, function(app) { 
				app.appname && return ~0;
				if(app.appname === devName){
					return 0;
				}
			}
			

		}

		
		

		_.each(function(item)){
		
		});
		
	} );
}
