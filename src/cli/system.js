"use strict";

const request = require('sync-request');

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
	checkVersion
};
