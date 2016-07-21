"use strict";
//var JSON = require('JSON');
var debug = require("debug")("cred_api");
var Table = require('cli-table2');
var x509 = require('x509');

var store = new (require("../services/BeameStore"))();
require('./../utils/Globals');
var developerServices = new (require('../core/DeveloperServices'))();
var atomServices = new (require('../core/AtomServices'))();
var edgeClientServices = new (require('../core/EdgeClientServices'))();

var path = require('path');
var fs = require('fs');
var mkdirp = require("mkdirp");

module.exports = {
	show,
	list,
	renew,
	revoke,
	shred,
	createAtom,
	createEdgeClient,
	createDeveloper,
	exportCredentials,
	importCredentials,
	importNonBeameCredentials,
	stats
};

function listCreds(type, fqdn) {
	var returnValues = [];
	if (type && !fqdn) {
		returnValues = store.list(type);
	}
	if (!type && fqdn) {
		returnValues = store.list("", fqdn);
	}
	if (!type && !fqdn) {
		returnValues = store.list();
	}
	return returnValues;
}

function show(type, fqdn) {
	debug("show %j %j", type, fqdn);

	var creds = listCreds(type, fqdn);
	return creds.map(cert => {
		var item = store.search(cert.hostname)[0];
		return x509.parseCert(item.X509 + "");
	});

}

show.toText = function (certs) {
	var table = new Table({
		head: ['Name', "Print", "Serial", "SigAlg"],
		colWidths: [25, 65, 30, 30]
	});

	certs.forEach(xcert => {
		//noinspection JSUnresolvedVariable
		table.push([xcert.subject.commonName, xcert.fingerPrint, xcert.serial, xcert.signatureAlgorithm]);
	});
	return table;
};


function list(type, fqdn) {
	debug("list %j %j", type, fqdn);
	return listCreds(type, fqdn);
}

list.toText = function (creds) {
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
	return function (error, data) {
		if (error) {
			console.error(error);
			process.exit(1);
		} else {
			callback(data);
		}
	};
}

if (developerServices.canCreateDeveloper()) {
	function createTestDeveloper(developerName, developerEmail, callback) {
		debug("Creating test developer developerName=%j developerEmail=%j", developerName, developerEmail);
		developerServices.createDeveloper(developerName, developerEmail, _stdCallback(callback));
	}
	createTestDeveloper.toText = lineToText;
	module.exports['createTestDeveloper'] = createDeveloper;
}

function createAtom(developerFqdn, atomName, count, callback) {
	for (var i = 0; i < count; i++) {
		console.warn("Creating atom developerFqdn=%j atomName=%j", developerFqdn, atomName);
		atomServices.createAtom(developerFqdn, atomName + i, _stdCallback(callback));
	}
}
createAtom.toText = lineToText;

function createDeveloper(developerFqdn, uid, callback) {
	console.warn("Creating developer developerFqdn=%j uid=%j ", developerFqdn, uid);
	developerServices.completeDeveloperRegistration(developerFqdn, uid, _stdCallback(callback));
}
createDeveloper.toText = lineToText;

function createEdgeClient(atomFqdn, count, callback) {
	for (var i = 0; i < count; i++) {
		console.warn("Creating edge client atomFqdn=%j", atomFqdn);
		edgeClientServices.createEdgeClient(atomFqdn, _stdCallback(callback));
	}
}

createEdgeClient.toText = lineToText;

function constructRelateivePathElements(item) {
	var items = [];
	var upShot = item;
	items.push(upShot.hostname);
	while (upShot.parent_fqdn) {
		upShot = store.search(upShot.parent_fqdn)[0];
		items.unshift(upShot.hostname);
	}
	return items;
}

function importNonBeameCredentials(fqdn) {
	var tls = require('tls');
	var conn = tls.connect(443, fqdn, {host: fqdn}, function () {
		//noinspection JSUnresolvedFunction
		var cert = conn.getPeerCertificate(true);
		conn.end();
		var buffer = new Buffer(cert.raw, "hex");
		var certBody = "-----BEGIN CERTIFICATE-----\r\n";
		certBody += buffer.toString("base64");
		certBody += "-----END CERTIFICATE-----";
		var remoteCertPath = path.join(global.globalPath, 'v1', 'remote', fqdn, 'x509.pem');
		//var requestPath = apiConfig.Endpoints.CertEndpoint + '/' + fqdn + '/' + 'x509.pem';

		mkdirp(path.parse(remoteCertPath).dir);
		fs.writeFileSync(remoteCertPath, certBody);
	});
}

function exportCredentials(fqdn, targetFqdn, file) {
	var creds = store.search(fqdn)[0];
	var relativePath = constructRelateivePathElements(creds);

	creds.edgeclient = {};
	creds.atom = {};
	creds['relativePath'] = relativePath;
	creds.path = creds.path.replace(global.devPath, "");

	var jsonString = JSON.stringify(creds);
	if (!jsonString) {
		console.error("Credentials for exporting are not found");
		return -1;
	}
	var crypto = require('./crypto');
	var encryptedString;
	try {
		encryptedString = crypto.encrypt(jsonString, targetFqdn);
	} catch (e) {
		console.error("Cound not encrypt", e);
		return {};
	}

	var message = {
		signedData: {
			data: encryptedString,
			signedby: fqdn,
			encryptedFor: targetFqdn
		}
	};
	message.signature = JSON.stringify(crypto.sign(message.signedData, fqdn));
	if (!file) {

	}
	else {
		var p = path.resolve(file);
		fs.writeFileSync(p, JSON.stringify(message));
		return p;
	}
}

function readStdinStream(callback) {
	var stdin = process.stdin,
		//stdout = process.stdout,
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

function decryptCreds(data) {
	var crypto = require('./crypto');
	var parsedData = JSON.parse(data);

	var signatureStatus = crypto.checkSignature(parsedData.signedData, parsedData.signedData.signedby, parsedData.signature);
	if (signatureStatus === true) {
		var creds = store.search(parsedData.signedData.encryptedFor)[0];

		if (!creds) {
			console.error("Private key for %j is not found", parsedData.signedData.encryptedFor);
			return -1;
		}

		return crypto.decrypt(JSON.stringify(parsedData.signedData.data));
	}
}

function importCredentials(data, file) {
	var decryptedCreds;

	if (!data && !file) {
		// XXX: to test
		readStdinStream(function (data) {
			decryptedCreds = decryptCreds(data);
			store.importCredentials(decryptedCreds);
		});
	} else {
		if (file) {
			data = fs.readFileSync(path.resolve(file)) + "";
			decryptedCreds = decryptCreds(data);
			if (!decryptedCreds || decryptedCreds == -1) {
				console.error("No decrypted creds");
				return false;
			}
			return store.importCredentials(decryptedCreds);
		} else {
			decryptedCreds = decryptCreds(JSON.parse(data));
			return store.importCredentials(decryptedCreds);
		}
	}
}

function renew(type, fqdn) {
	debug("renew %j %j", type, fqdn);

}

function revoke(fqdn) {

	var creds = store.search(fqdn)[0];
	console.log("creds level %j", creds.level);
	switch (creds.level) {
		case 'developer': {
			console.error("Revoke for developer cert is not available");
			return;
		}
		case 'atom': {
			atomServices.revokeCert(fqdn, function (error, payload) {
				if (error) {
					console.error("Error, %j", error);
				}
				console.log("Payload %j", payload);
				return payload;
			});
			break;
		}
		case 'edgeclient': {
			console.log("Calling revoke cert");
			edgeClientServices.revokeCert(fqdn, function (error, payload) {
				if (error) {
					console.error("Error, %j", error);
				}
				console.log("Payload %j", payload);
				return payload;
			});
			break;
		}
	}

	debug("revoke   %j", fqdn);
}

function shred(fqdn, callback) {
	if (!fqdn) {
		throw new Error("FQDN is required in shred");
	}
	store.shredCredentials(fqdn, callback);
}

function stats(fqdn){
	if (!fqdn) {
		throw new Error("FQDN is required in shred");
	}

	var creds = store.search(fqdn)[0];

	if(!creds){
		throw new Error("FQDN not found");
	}

	var cb = function(error,payload){
		if(!error) return payload;

		throw new Error(error.message);
	};

	switch (creds.level) {
		case 'developer': {
			developerServices.getStats(fqdn,cb);
			break;
		}
		case 'atom': {
			atomServices.getStats(fqdn,cb);
			break;
		}
		case 'edgeclient': {
			edgeClientServices.getStats(fqdn,cb);
			break;
		}
	}

}
stats.toText = lineToText;

