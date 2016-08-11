"use strict";
/** @namespace Creds **/


/**
 * @typedef {Object} CredsListItem
 * @property {String} name
 * @property {String} hostname
 * @property {String} level
 * @property {String} parent
 */

/**
 * @typedef {Object} CertListItem
 * @property {String} level
 * @property {String} hostname
 * @property {String} print
 * @property {String} serial
 */

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


/** private helpers and services **/

/**
 * @private
 * @param line
 * @returns {*}
 */
function lineToText(line) {
	var table = new Table();
	for (let k in line) {
		//noinspection JSUnfilteredForInLoop
		table.push({[k]: line[k].toString()});
	}

	return table;
}

/**
 * @private
 * @param line
 * @returns {string}
 */
function objectToText(line) {
	var line2 = {};
	Object.keys(line).forEach(k => {
		if (isObject(line[k])) {
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			line2[k] = JSON.stringify(line[k]);
		}
		else {
			line2[k] = line[k].toString();
		}
	});

	return lineToText(line2);
}

/**
 * @private
 * @param item
 * @returns {Array}
 */
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

/**
 * @private
 * @param {Function} callback
 */
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

/**
 * @private
 * @param {String} data
 * @returns {*}
 */
function decryptCreds(data) {
	var crypto     = require('./crypto');
	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	var parsedData = JSON.parse(data);

	//noinspection JSCheckFunctionSignatures
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

/**
 * @private
 * @param str
 * @returns {boolean}
 */
function isObject(str) {
	try {
		return typeof str === 'object';
	} catch (e) {
		return false;
	}
}

/** public methods **/

/**
 * Return list of credentials
 * @private
 * @param {'developer'|'atom'|'edgeclient'|'localclient'|null} [type] creds type
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array<CredsListItem>}
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

/**
 * Return list of certificate properties
 * @public
 * @method Creds.show
 * @param {'developer'|'atom'|'edgeclient'|'localclient'|null} [type] creds type
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array.<CertListItem>}
 */
function show(type, fqdn) {
	logger.debug(`show ${type} ${fqdn}`);

	var creds = listCreds(type, fqdn);
	return creds.map(cert => store.search(cert.hostname)[0]).filter(item => item.X509).map(item => {
		var data      = x509.parseCert(item.X509 + "");
		data['level'] = item.level;
		return data;
	});

}

show.toText = function (certs) {
	var table = new Table({
		head:      ["level", "hostname", "print", "serial"],
		colWidths: [15, 80, 65, 30]
	});

	certs.forEach(xcert => {
		//noinspection JSUnresolvedVariable
		table.push([xcert.level, xcert.subject.commonName, xcert.fingerPrint, xcert.serial]);
	});
	return table;
};

/**
 * Return list of credentials
 * @public
 * @method Creds.list
 * @param {'developer'|'atom'|'edgeclient'|'localclient'|null} [type] creds type
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array.<CredsListItem>}
 */
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

function shred(fqdn, callback) {
	if (!fqdn) {
		logger.fatal("FQDN is required in shred");
	}
	store.shredCredentials(fqdn, callback);
}

shred.toText = lineToText;

/**
 * @private
 * @param developerName
 * @param developerEmail
 * @param callback
 */
function createTestDeveloper(developerName, developerEmail, callback) {
	logger.debug(`Creating test developer ${developerName} ${developerEmail}`);
	developerServices.createDeveloper(developerName, developerEmail, callback);
}
createTestDeveloper.toText = lineToText;

if (developerServices.canCreateDeveloper()) {
	module.exports.createTestDeveloper = createTestDeveloper;
}

/**
 * @private
 * @param developerName
 * @param developerEmail
 * @param callback
 */
function registerDeveloper(developerName, developerEmail, callback) {
	developerServices.registerDeveloper(developerName, developerEmail, callback);
}
registerDeveloper.toText = lineToText;

if (developerServices.canRegisterDeveloper()) {
	module.exports.registerDeveloper = registerDeveloper;
}

/**
 * Create developer from registration email credentials
 * @public
 * @method Creds.createDeveloper
 * @param {String} developerFqdn - developer hostname(fqdn)
 * @param {String} uid           - developer Uid
 * @param {Function} callback
 */
function createDeveloper(developerFqdn, uid, callback) {
	logger.info(`Creating developer developerFqdn=${developerFqdn} uid=${uid}`);
	developerServices.completeDeveloperRegistration(developerFqdn, uid, callback);
}
createDeveloper.toText = lineToText;

/**
 * Create Atom for Developer
 * @public
 * @method Creds.createAtom
 * @param {String} developerFqdn
 * @param {String} atomName
 * @param {Function} callback
 */
function createAtom(developerFqdn, atomName, callback) {
	logger.info(`Creating atom ${atomName} for developer ${developerFqdn} `);
	atomServices.createAtom(developerFqdn, atomName, callback);

}
createAtom.toText = lineToText;

/**
 * Create Edge Client for Atom
 * @public
 * @method Creds.createEdgeClient
 * @param {String} atomFqdn
 * @param {Function} callback
 */
function createEdgeClient(atomFqdn, callback) {
	logger.info(`Creating edge client for Atom ${atomFqdn}`);
	edgeClientServices.createEdgeClient(atomFqdn, callback);

}
createEdgeClient.toText = lineToText;

/**
 * Create Local Client under Edge Client
 * @public
 * @method Creds.createLocalClient
 * @param {String} atomFqdn
 * @param {String} edgeClientFqdn
 * @param {Function} callback
 */
function createLocalClient(atomFqdn, edgeClientFqdn, callback) {
	logger.info(`Creating local client for Atom ${atomFqdn}`);
	localClientServices.createLocalClients(atomFqdn, edgeClientFqdn, callback);
}

/**
 * Export credentials from source fqdn to target fqdn
 * @public
 * @method Creds.exportCredentials
 * @param {String} fqdn - fqdn of credentials to export
 * @param {String} targetFqdn - fqdn of the entity to encrypt for
 * @param {String} file - path to file
 * @returns {{}}
 */
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
	//noinspection ES6ModulesDependencies,NodeModulesDependencies,JSCheckFunctionSignatures
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

/**
 * Import credentials exported with exportCredentials method
 * @public
 * @method Creds.importCredentials
 * @param {String|null} [data] - encrypted credentials in string format
 * @param {String|null} [file] - path to file with encrypted credentials
 * @returns {boolean}
 */
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

/**
 * Import non Beame credentials by fqdn and save to to ./beame/v{}/remote
 * @public
 * @method Creds.importNonBeameCredentials
 * @param {String} fqdn
 */
function importNonBeameCredentials(fqdn) {
	var tls = require('tls');
	try {

		var conn = tls.connect(443, fqdn, {host: fqdn});

		var onSecureConnected = function () {
			//noinspection JSUnresolvedFunction
			var cert = conn.getPeerCertificate(true);
			conn.end();

			var bas64Str   = new Buffer(cert.raw, "hex").toString("base64");

			var certBody = "-----BEGIN CERTIFICATE-----\r\n";

			certBody += bas64Str.match(/.{1,64}/g).join("\r\n") + "\r\n";

			certBody += "-----END CERTIFICATE-----";

			var remoteCertPath = path.join(config.remoteCertsDir, fqdn, 'x509.pem');

			mkdirp(path.parse(remoteCertPath).dir);

			fs.writeFileSync(remoteCertPath, certBody);
		};

		conn.on('error', function (error) {

			var msg = error && error.message || error.toString();

			logger.fatal(msg);
		});

		conn.once('secureConnect', onSecureConnected);

	}
	catch (e) {
		logger.fatal(e.toString());
	}

}

/**
 * Return stats by entity fqdn
 * @public
 * @method Creds.stats
 * @param {String} fqdn
 * @param {Function} callback
 */
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
			return callback(null, payload);
		}

		logger.fatal(error);
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
stats.toText = objectToText;

/**
 * @private
 * @param type
 * @param fqdn
 */
function renew(type, fqdn) {
	logger.debug(`renew ${type} ${fqdn}`);

}

/**
 * @private
 * @param fqdn
 */
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




