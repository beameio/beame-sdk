"use strict";

var request = require('sync-request');

var creds = require('./creds');
var servers = require('./servers');

function start(){
	var readline = require('readline');

	const inter = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	console.warn('Please go to https://registration.beameio.net and fill in the form');
	inter.question("Please enter hostname you got in the email: ", function(developerFqdn) {
		inter.question("Please enter UID you got in the email: " , function(uid) {
			inter.question("Please Enter Atom Name (For example 'MyApp'): ", function(atomName) {
				console.log("+ Creating developer level cert this will take about 30 seconds....");
				creds.createDeveloper(developerFqdn, uid, function(data){
					console.warn("+ Developer credentials have been created:", developerFqdn);
					console.warn("+ Creating atom");
					creds.createAtom(developerFqdn, atomName, 1, function (data) {
						console.warn("+ Atom credentials have been created and signed:", data.hostname);
						console.warn("+ Creating edge client")
						creds.createEdgeClient(data.hostname, 1, function(data){
							console.warn("+ Edge client credentials have been created and signed:", data.hostname);
							console.warn(`+ Launching a webserver at https://${data.hostname}/`);
							servers.HttpsServerTestStart(data.hostname);
						});
					})
				})
				inter.close();
			});
		});
	});

//	i.write("To initiate the beame-sdk, please go to https://register.beame.io");

	/**/

}

function checkVersion(){
	var currentVersion = require("../../package.json");
	var npmStatus = JSON.parse(request('GET','https://registry.npmjs.org/beame-sdk/').body);

	if(npmStatus['dist-tags'].latest === currentVersion.version){
		console.info("You are using the latest beame-sdk version", currentVersion.version);
	}else{
		console.info(`You are using and older ${currentVersion.version} version of beame sdk but the latest version is ${npmStatus['dist-tags'].latest}`);
	}
}

//checkVersion();
module.exports = 
{

	start,
	checkVersion
};
