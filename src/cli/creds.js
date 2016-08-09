"use strict";
//var JSON = require('JSON');
var Table = require('cli-table2');

require('../../initWin');
var x509 = require('x509');

var store               = new (require("../services/BeameStore"))();
var config              = require('../../config/Config');
const module_name       = config.AppModules.BeameCreds;
var BeameLogger         = require('../utils/Logger');
var logger              = new BeameLogger(module_name);
var developerServices   = new (require('../core/DeveloperServices'))();
var atomServices        = new (require('../core/AtomServices'))();
var edgeClientServices  = new (require('../core/EdgeClientServices'))();
var localClientServices = new (require('../core/LocalClientServices'))();

var path   = require('path');
var fs     = require('fs');
var mkdirp = require("mkdirp");

/**
 * @private
 * Enum string values.
 * @enum {string}
 */
const EntityType = {
	developer: "developer",
	atom: "atom",
	edgeclient:"edgeclient",
	localclient:"localclient"
};


module.exports = {
	show,
	list,
	//renew,
	//revoke,
	shred,
	createAtom,
	createEdgeClient,
	createLocalClient,
	createDeveloper,
	exportCredentials,
	importCredentials,
	importNonBeameCredentials,
	stats
};

/**
 * Return
 * @param {EntityType|null|undefined} [type]
 * @param {String|null|undefined} [fqdn] entity fqdn
 * @returns {Array}
 */
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
	logger.debug(`show ${type} ${fqdn}`);

	var creds = listCreds(type, fqdn);
	return creds.map(cert => store.search(cert.hostname)[0]).filter(item => item.X509).map(item => {
		var data = x509.parseCert(item.X509 + "");
		data['level'] = item.level;
		return data;
	});

}

show.toText = function (certs) {
	var table = new Table({
		head:      ['level','name', "print", "serial"],
		colWidths: [15, 80, 65, 30]
	});

	certs.forEach(xcert => {
		//noinspection JSUnresolvedVariable
		table.push([xcert.level,xcert.subject.commonName, xcert.fingerPrint, xcert.serial]);
	});
	return table;
};


function list(type, fqdn) {
	logger.debug(`list ${type} ${fqdn}`);
	return listCreds(type, fqdn);
}

list.toText = function (creds) {
	var table = new Table({
		head:      ['name', 'hostname', 'level', 'parent'],
		colWidths: [25, 55, 15, 55]
	});
	creds.forEach(item => {
		table.push([item.name, item.hostname, item.level, item.parent]);
	});
	return table;
};

function lineToText(line) {
	var table = new Table();
	for(let k in line) {
		//noinspection JSUnfilteredForInLoop
		table.push({[k]: line[k].toString()});
	}
	return table;
}


function createTestDeveloper(developerName, developerEmail, callback) {
	logger.debug(`Creating test developer ${developerName} ${developerEmail}`);
	developerServices.createDeveloper(developerName, developerEmail, callback);
}
createTestDeveloper.toText = lineToText;

if (developerServices.canCreateDeveloper()) {
	module.exports.createTestDeveloper = createTestDeveloper;
}

function registerDeveloper(developerName, developerEmail, callback) {
	developerServices.registerDeveloper(developerName, developerEmail, callback);
}
registerDeveloper.toText = lineToText;

if (developerServices.canRegisterDeveloper()) {
	module.exports.registerDeveloper = registerDeveloper;
}

function createAtom(developerFqdn, atomName, count, callback) {
	if (count != 1) {
		logger.fatal("Count of not one is not supported yet", {developerFqdn, atomName, count});
	}
	for (var i = 0; i < count; i++) {
		let n = count > 1 ? i + 1 : '';
		logger.info(`Creating atom developerFqdn=${developerFqdn} atomName=${atomName}`); //index=${n}
		atomServices.createAtom(developerFqdn, atomName + n, callback);
	}
}
createAtom.toText = lineToText;

function createDeveloper(developerFqdn, uid, callback) {
	logger.info(`Creating developer developerFqdn=${developerFqdn} uid=${uid}`);
	developerServices.completeDeveloperRegistration(developerFqdn, uid, callback);
}
createDeveloper.toText = lineToText;

function createEdgeClient(atomFqdn, count, callback) {
	if (count != 1) {
		logger.fatal("Count of not one is not supported yet", {atomFqdn, count});
	}
	for (var i = 0; i < count; i++) {
		logger.info(`Creating edge client atomFqdn=${atomFqdn}`);
		edgeClientServices.createEdgeClient(atomFqdn, callback);
	}
}
createEdgeClient.toText = lineToText;

function createLocalClient(atomFqdn, count, edgeClientFqdn, callback) {
	if (count != 1) {
		logger.fatal("Count of not one is not supported yet", {atomFqdn, count});
	}

	for (var i = 0; i < count; i++) {
		logger.info(`Creating local client atomFqdn=${atomFqdn}`);
		localClientServices.createLocalClients(atomFqdn, edgeClientFqdn, callback);
	}
}

function constructRelativePathElements(item) {
	var items  = [];
	var upShot = item;
	items.push(upShot.hostname);
	while (upShot.parent_fqdn) {
		upShot = store.search(upShot.parent_fqdn)[0];
		items.unshift(upShot.hostname);
	}
	return items;
}

function importNonBeameCredentials(fqdn) {
	var tls  = require('tls');
	var conn = tls.connect(443, fqdn, {host: fqdn}, function () {
		//noinspection JSUnresolvedFunction
		var cert = conn.getPeerCertificate(true);
		conn.end();
		var buffer         = new Buffer(cert.raw, "hex");
		var certBody       = "-----BEGIN CERTIFICATE-----\r\n";
		certBody += buffer.toString("base64");
		certBody += "-----END CERTIFICATE-----";
		var remoteCertPath = path.join(config.remoteCertsDir, fqdn, 'x509.pem');

		mkdirp(path.parse(remoteCertPath).dir);
		fs.writeFileSync(remoteCertPath, certBody);
	});
}

function exportCredentials(fqdn, targetFqdn, file) {
	var creds        = store.search(fqdn)[0];
	var relativePath = constructRelativePathElements(creds);

	creds.edgeclient      = {};
	creds.atom            = {};
	creds['relativePath'] = relativePath;
	creds.path            = creds.path.replace(config.localCertsDir, "");

	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	var jsonString = JSON.stringify(creds);
	if (!jsonString) {
		logger.fatal(`Credentials for exporting ${fqdn} credentials are not found`);
	}
	var crypto = require('./crypto');
	var encryptedString;
	try {
		encryptedString = crypto.encrypt(jsonString, targetFqdn);
	} catch (e) {
		logger.error(`Could not encrypt with error `, e);
		return {};
	}

	var message       = {
		signedData: {
			data:         encryptedString,
			signedby:     fqdn,
			encryptedFor: targetFqdn
		}
	};
	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	message.signature = JSON.stringify(crypto.sign(message.signedData, fqdn));
	if (!file) {

	}
	else {
		var p = path.resolve(file);
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		fs.writeFileSync(p, JSON.stringify(message));
		return p;
	}
}

function readStdinStream(callback) {
	var stdin       = process.stdin,
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
	var crypto     = require('./crypto');
	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	var parsedData = JSON.parse(data);

	var signatureStatus = crypto.checkSignature(parsedData.signedData, parsedData.signedData.signedby, parsedData.signature);
	if (signatureStatus === true) {
		var creds = store.search(parsedData.signedData.encryptedFor)[0];

		if (!creds) {
			logger.fatal(`Private key for ${parsedData.signedData.encryptedFor} is not found`);
		}
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
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
			data           = fs.readFileSync(path.resolve(file)) + "";
			decryptedCreds = decryptCreds(data);
			if (!decryptedCreds || decryptedCreds == -1) {
				logger.error("No decrypted creds");
				return false;
			}
			return store.importCredentials(decryptedCreds);
		} else {
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			decryptedCreds = decryptCreds(JSON.parse(data));
			return store.importCredentials(decryptedCreds);
		}
	}
}

function renew(type, fqdn) {
	logger.debug(`renew ${type} ${fqdn}`);

}

function revoke(fqdn) {

	var creds = store.search(fqdn)[0];
	logger.debug(`revoke creds level ${creds.level}`);
	switch (creds.level) {
		case 'developer': {
			logger.fatal("Revoke for developer cert is not available");
			break;
		}
		case 'atom': {
			atomServices.revokeCert(fqdn, function (error, payload) {
				if (error) {
					logger.fatal(error.message, error.data, error.module);
				}
				logger.debug(`Revoke atom certs payload`, payload);
				return payload;
			});
			break;
		}
		case 'edgeclient': {
			logger.debug("Calling edge client revoke cert");
			edgeClientServices.revokeCert(fqdn, function (error, payload) {
				if (error) {
					logger.fatal(error.message, error.data, error.module);
				}
				logger.debug(`Revoke edge client certs payload`, payload);
				return payload;
			});
			break;
		}
		case 'localclient': {
			logger.debug("Calling local client revoke cert");
			edgeClientServices.revokeCert(fqdn, function (error, payload) {
				if (error) {
					logger.fatal(error.message, error.data, error.module);
				}
				logger.debug(`Revoke local client certs payload`, payload);
				return payload;
			});
			break;
		}
	}

}

function shred(fqdn, callback) {
	if (!fqdn) {
		logger.fatal("FQDN is required in shred");
	}
	store.shredCredentials(fqdn, callback);
}

function stats(fqdn, callback) {
	if (!fqdn) {
		logger.fatal("FQDN is required in shred");
	}

	var creds = store.search(fqdn)[0];

	if (!creds) {
		logger.fatal("FQDN not found");
	}

	var cb = function (error, payload) {
		if (!error) {
			return callback(payload);
		}

		logger.fatal(error.message);
	};

	switch (creds.level) {
		case 'developer': {
			developerServices.getStats(fqdn, cb);
			break;
		}
		case 'atom': {
			atomServices.getStats(fqdn, cb);
			break;
		}
		case 'edgeclient': {
			edgeClientServices.getStats(fqdn, cb);
			break;
		}
	}

}

function isObject(str) {
	try {
		return typeof str === 'object';
	} catch (e) {
		return false;
	}
}

function objectToText(line) {
	return Object.keys(line).map(k => {
		if (!isObject(line[k])) {
			return k + '=' + line[k].toString();
		}

		var json = line[k];
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		return k + '=' + JSON.stringify(json);
	}).join('\n');
}

stats.toText = objectToText;

