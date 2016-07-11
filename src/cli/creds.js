"use strict";

var _ = require('underscore');
var fs = require('fs');
var jmespath = require('jmespath');
var debug = require("debug")("cred_api");
var BeameStore = require("../services/BeameStore");
var store = new BeameStore();
var Table = require('cli-table2');
var x509 = require('x509');
var developerServices = new(require('../core/DeveloperServices'))();
var atomServices = new(require('../core/AtomServices'))();
var edgeClientServices = new(require('../core/EdgeClientServices'))();
var GlobalConfig = require('../../config/ApiConfig.json');
var readline = require('readline');

///
//
// We want to print out
// Level, hostname,
//


function show(type, fqdn, format){
	debug("show %j %j %j", type,  fqdn, format);

	var returnValues = listCreds(type, fqdn);
	var certs = _.map(returnValues, function(cert) {
		var item = store.search(cert.hostname);
		var xcert = x509.parseCert(item[0].X509 + "");
		return xcert;
	});

	if(format == "json") {
		console.log(JSON.stringify(certs));
	} else {
		var table = new Table({
			head: ['Name', "Print", "Serial", "SigAlg"],
			colWidths: [25, 65, 30, 30]
		});

		_.each(certs, function(xcert) {
			table.push([xcert.subject.commonName, xcert.fingerPrint, xcert.serial,  xcert.signatureAlgorithm]);
		});

		console.log(table.toString());
	}
}

function listCreds(type, fqdn){
	var returnValues = [];
	if(type && !fqdn) {
		returnValues = store.list(type);
	}
	if(!type && fqdn) {
		returnValues = store.list("", fqdn);
	}
	if(!type && !fqdn) {
		returnValues = store.list();
	}
	return returnValues;
}

function list(type,  fqdn,format){
	debug("list %j %j %j", type,  fqdn, format);
	var returnValues = listCreds(type, fqdn);

	switch(format) {

		case "json": {
			console.log(JSON.stringify(returnValues));
			break;
		};

		case "text": {
			var table = new Table({
				head: ['name', 'hostname', 'level'],
				colWidths: [15, 70, 15]
			});
			_.each(returnValues, function (item) {
				table.push([item.name, item.hostname, item.level]);
			});
			console.log(table.toString());
			break;
		};

		default: {
			throw new Error("Invalid print_table format: " + format);
		}
	}
}

function printLine(data, error, format){
	if(format == "json"){
		console.log(JSON.stringify(data));
	}else{
		_.map(data, function(value, key) { 

			console.log("Key %j, %j", key, value);
		} )
	}
}

function createTestDeveloper(developerName, developerEmail){
	debug ( "createTestDeveloper %j ",developerName, developerEmail );
	developerServices.createDeveloper(developerName, developerEmail, function(error, data){
		if(!error){
			printLine(data, error,'json');
			process.exit(0);
		}
		else{
			console.error(error);
			process.exit(1);
		}
	}) 
}

function createAtom(developerFqdn, atomName, format){
	if(developerFqdn && atomName){
		console.warn("Creating atom %j %j", developerFqdn, atomName);
		atomServices.createAtom(developerFqdn, atomName, function(err, data) {
			if(!err){
				printLine(data, error,format);
				process.exit(0);
			}
			else{
				console.error(error);
				process.exit(1);
			}
		});
	}
}

function createDeveloper(developerFqdn, uid, format){
	if(developer_fqdn && uid){
		console.warn("dev create %j %j ", developerFqdn, uid);
		developerServices.completeDeveloperRegistration(developer_fqdn ,uid, function(error, data){
			if(!error){
				printLine(data, error,format);
				process.exit(0);
			}
			else{
				console.error(error);
				process.exit(1);
			}
		});
	};
}

function createEdgeClient(atom_fqdn, format){
	if(atom_fqdn){
		console.warn("getting edge server certificate signed");
		edgeClientServices.createEdgeClient(atom_fqdn, function(error, data){
			if(!error){
				printLine(data, error,format);
				process.exit(0);
			}
			else{
				console.error(error);
				process.exit(1);
			}
		});
	};
}


function renew(type,  fqdn,format){
	debug ( "renew %j %j %j",  type,  fqdn, format);
}

function purge(type,  fqdn,format){
	debug ( "purge %j %j %j",  type,  fqdn, format);
}


module.exports = {
	show:	show,
	list:	list,
	renew:	renew,
	purge:	purge,
	createAtom: createAtom,
	createEdgeClient: createEdgeClient,
	createDeveloper: createDeveloper,
	createTestDeveloper: createTestDeveloper
};
