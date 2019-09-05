"use strict";

var devHostname = ""; // Put your developer FQDN here

var beameSDK = require ("beame-sdk");
var express = require('express');
var appExpress = express();
appExpress.use(express.static(__dirname + '/public'));

if(!devHostname) {
	console.log("DevHostname needs to be filled with your developer fqdn to use. Please read README.md");
	process.exit(1);
}

beameSDK.BaseHttpsServer(devHostname, {}, appExpress, (data, app) => {
	console.log('Server started on: https://'+devHostname);
	// process http events here with <app> if needed
});
