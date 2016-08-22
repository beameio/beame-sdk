"use strict";

var request = require('sync-request');

var creds         = require('./creds');
var servers       = require('./servers');
var config        = require('../../config/Config');
const module_name = config.AppModules.BeameSystem;
var BeameLogger   = require('../utils/Logger');
var logger        = new BeameLogger(module_name);

function start() {
	var readline = require('readline');

	const inter = readline.createInterface({
		input:  process.stdin,
		output: process.stdout
	});

	logger.info(`Please go to ${config.AuthServerEndPoint} and fill in the form`);
	inter.question("Please enter hostname you got in the email: ", function (developerFqdn) {
		inter.question("Please enter UID you got in the email: ", function (uid) {
			inter.question("Please Enter Atom Name (For example 'MyApp'): ", function (atomName) {
				logger.info(`Creating developer level cert this will take about 30 seconds....`);
				creds.createDeveloper(developerFqdn, uid, function (error, data) {
					if (error) {
						logger.fatal(error.message, error.data, config.AppModules.Developer);
					}
					logger.info(`Developer credentials have been created: ${developerFqdn}`);
					logger.info(`Creating atom ${atomName}`);
					creds.createAtom(developerFqdn, atomName, function (error, data) {
						if (error) {
							logger.fatal(error.message, error.data, config.AppModules.Atom);
						}
						logger.info(`Atom credentials have been created and signed:${data.hostname}`);
						logger.info(`Creating edge client`);
						creds.createEdgeClient(data.hostname, function (error, data) {
							if (error) {
								logger.fatal(error.message, error.data, config.AppModules.EdgeClient);
							}
							logger.info(`Edge client credentials have been created and signed:${data.hostname}`);
							logger.info(`Launching a webserver at https://${data.hostname}/`);
							servers.launchHelloWorldServer(data.hostname);
						});
					})
				});
				inter.close();
			});
		});
	});
}

function checkVersion() {
	var currentVersion = require("../../package.json");
	//noinspection ES6ModulesDependencies,NodeModulesDependencies,JSUnresolvedVariable
	var npmStatus      = JSON.parse(request('GET', 'https://registry.npmjs.org/beame-sdk/').body);

	//noinspection JSUnresolvedVariable
	return {
		'installed':        currentVersion.version,
		'available':        npmStatus['dist-tags'].latest,
		'update-available': npmStatus['dist-tags'].latest !== currentVersion.version
	}

}

checkVersion.toText = data => {
	if (data['update-available']) {
		return `You are using and older ${data.installed} version of beame sdk but the latest version is ${data.available}`;
	} else {
		return `You are using the latest beame-sdk version ${data.installed}`;
	}
};

module.exports =
{
	start,
	checkVersion
};
