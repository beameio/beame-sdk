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

function createTestDeveloper(developerName, developerEmail){

	debug ( "createTestDeveloper %j ",developerName, developerEmail );
	developerServices.createDeveloper(developerName, developerEmail, function(error, data){
		if(!error){
			console.log(JSON.stringify(data));
			process.exit(0);
		}
		else{
			console.error(error);
			process.exit(1);
		}
	}) 
}

function create(type,  fqdn, uid, atom, format){
	debug ( "create %j %j %j",  type,  fqdn, uid, atom, format);

	if(type == "developer" && fqdn && uid){
		console.log("dev create");
		developerServices.completeDeveloperRegistration(fqdn ,uid,function(error,payload){
			if(!error){
				process.exit(0);
			}
			else{
				console.error(error);
				process.exit(1);
			}
		});
	};
	
	if(type == "atom" && fqdn && atom){
		console.warn("Creating atom ", fqdn, atom);
		atomServices.createAtom(fqdn,atom, function(err, data) {
			console.log(data);
		
		});
	}

	if(type == "edgeclient" && fqdn) {
		var appEntry = store.search(fqdn);
	//	EdgeClientServices.prototype.createEdgeClient = function (appEntry.hostname, function () {
			
	//	}) {}
		
		// currently sserge requires paremetrs for dev hostname

		//edgeClientServices.
	}
	
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
	create:	create,
	renew:	renew,
	purge:	purge,
	createTestDeveloper: createTestDeveloper
};
