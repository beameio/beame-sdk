"use strict";

var debug = require("debug")("cred_api");
var Table = require('cli-table2');
var x509 = require('x509');

var store = new (require("../services/BeameStore"))();
var developerServices = new(require('../core/DeveloperServices'))();
var atomServices = new(require('../core/AtomServices'))();
var edgeClientServices = new(require('../core/EdgeClientServices'))();
var beameDirService = require('../services/BeameDirServices');
var path = require('path');
var fs = require('fs');

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

function show(type, fqdn){
	debug("show %j %j", type,  fqdn);

	var creds = listCreds(type, fqdn);
	var certs = creds.map(cert => {
		var item = store.search(cert.hostname)[0];
		return x509.parseCert(item.X509 + "");
	});

	return certs;
}

show.toText = function(certs) {
	var table = new Table({
		head: ['Name', "Print", "Serial", "SigAlg"],
		colWidths: [25, 65, 30, 30]
	});

	certs.forEach(xcert => {
		table.push([xcert.subject.commonName, xcert.fingerPrint, xcert.serial,  xcert.signatureAlgorithm]);
	});
	return table;
};


function list(type, fqdn){
	debug("list %j %j", type,  fqdn);
	return listCreds(type, fqdn);
}

list.toText = function(creds) {
	var table = new Table({
		head: ['name', 'hostname', 'level'],
		colWidths: [15, 70, 15]
	});
	creds.forEach(item => {
		table.push([item.name, item.hostname, item.level]);
	});
	return table;
};

function lineToText(line) {
	return Object.keys(line).map(k => {
		return k + '=' + line[k].toString();
	}).join('\n');
}

function _stdCallback(callback) {
	return function(error, data) {
		if(error) {
			console.error(error);
			process.exit(1);
		} else {
			callback(data);
		}
	};
}

function createTestDeveloper(developerName, developerEmail, callback){
	debug("Creating test developer developerName=%j developerEmail=%j", developerName, developerEmail);
	developerServices.createDeveloper(developerName, developerEmail, _stdCallback(callback));
}
createTestDeveloper.toText = lineToText;

function createAtom(developerFqdn, atomName, callback){
	console.warn("Creating atom developerFqdn=%j atomName=%j", developerFqdn, atomName);
	atomServices.createAtom(developerFqdn, atomName, _stdCallback(callback));
}
createAtom.toText = lineToText;

function createDeveloper(developerFqdn, uid, callback){
	console.warn("Creating developer developerFqdn=%j uid=%j ", developerFqdn, uid);
	developerServices.completeDeveloperRegistration(developerFqdn ,uid, _stdCallback(callback));
}
createDeveloper.toText = lineToText;

function createEdgeClient(atomFqdn, callback){
	console.warn("Creating edge client atomFqdn=%j", atomFqdn);
	edgeClientServices.createEdgeClient(atomFqdn, _stdCallback(callback));
}
createEdgeClient.toText = lineToText;

function exportCredentials(fqdn, targetFqdn, file){
	var creds = store.search(fqdn);
	var jsonString = JSON.stringify(creds[0]);
	if(!jsonString){
		console.error("Credentials for exporting are not found");
		return -1;
	}
	var crypto = require('./crypto');
	var encryptedString;
	try{
		encryptedString = crypto.encrypt(jsonString, targetFqdn);
	} catch(e){ console.error("Cound not encrypt", e); return {}; } 

	var message= {
		signedData :{
			data: encryptedString, 
			signedby: fqdn,
			encryptedfor: targetFqdn
		}
	};
	message.signature = JSON.stringify(crypto.sign(message.signedData, fqdn ));
	if(!file) {

	}
	else{
		var p = path.resolve(file);
		fs.writeFileSync(p, JSON.stringify(message));
		return p;
	}

}
function readStdinStream(callback){
	var stdin = process.stdin,
		stdout = process.stdout,
		inputChunks = [];

	stdin.resume();
	stdin.setEncoding('utf8');

	stdin.on('data', function (chunk) {
		inputChunks.push(chunk);
	});

	stdin.on('end', function () {
		callback(inputChunks.join());
	});
}

function  decryptCreds(data) {
	var crypto = require('./crypto');
	var parsedData = JSON.parse(data);

	var signatureStatus = crypto.checkSignature(parsedData.signedData, parsedData.signedData.signedby, parsedData.signature);
	if(signatureStatus === true) {
		var creds = store.search(parsedData.signedData.encryptedfor)[0];
		var decryptedcreds = crypto.decrypt(parsedData.signedData.data);
		return decryptedcreds;
	}
}

function importCredentials(data, file){
	var credsToImport;
	var decryptedCreds;
	if(!data && !file) {
		readStdinStream(function (data) {
			decryptedCreds = decryptCreds(data);
			store.importCredentials(data);
		});
	}else {
		if(file){
			data = fs.readFileSync(path.resolve(file))+ "";
			decryptedCreds = decryptCreds(data);
			if(!decryptedCreds ){
				return -1;
      }
			return store.importCredentials(decryptedCreds);
		}else {
			decryptedCreds = decryptCreds(JSON.parse(data));
			return  store.importCredentials(decryptedCreds);
		}
	}
}

function renew(type, fqdn){
	debug ("renew %j %j",  type,  fqdn);
}

function purge(type, fqdn){
	debug ("purge %j %j",  type,  fqdn);
}


module.exports = {
	show,
	list,
	renew,
	purge,
	createAtom,
	createEdgeClient,
	createDeveloper,
	createTestDeveloper,
	exportCredentials,
	importCredentials
};
