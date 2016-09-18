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

const Table = require('cli-table2');

require('../../initWin');

const store             = new (require("../services/BeameStore"))();
const store2            = new (require("../services/BeameStoreV2"))();
const config            = require('../../config/Config');
const module_name       = config.AppModules.BeameCreds;
const BeameLogger       = require('../utils/Logger');
const logger            = new BeameLogger(module_name);
const directoryServices = new (require('../services/DirectoryServices'))();
const beameUtils        = require('../utils/BeameUtils');


const path   = require('path');
const fs     = require('fs');
const mkdirp = require("mkdirp");

module.exports = {
	show,
	list,
	signAndCreate,
	createWithToken,
	createWithLocalCreds,
	//renew,
	//revoke,
	shred,
	exportCredentials,
	importCredentials,
	importNonBeameCredentials,
	stats,
	convertCredentialsToV2
};

/**
 *
 * @param {SignatureToken} authToken
 * @param {String|null} [authSrvFqdn]
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {String|null} [localIp]
 * @param {Function} callback
 */
function createWithToken(authToken, authSrvFqdn, name, email, localIp, callback) {
	var cred = new (require('../services/Credential'))(store2);

	cred.createEntityWithAuthServer(authToken, authSrvFqdn, name, email, localIp).then(metadata=> {
		callback && callback(null, metadata)
	}).catch(error=> {
		callback && callback(error, null)
	})

}
createWithToken.toText = lineToText;

/**
 *
 * @param {String} parent_fqdn
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {String|null} [localIp]
 * @param {Function} callback
 */
function createWithLocalCreds(parent_fqdn, name, email, localIp, callback) {
	var cred = new (require('../services/Credential'))(store2);

	cred.createEntityWithLocalCreds(parent_fqdn, name, email, localIp).then(metadata=> {
		callback && callback(null, metadata)
	}).catch(error=> {
		callback && callback(error, null)
	})

}
createWithLocalCreds.toText = lineToText;

/**
 *
 * @param {String} signWithFqdn
 * @param {Object|String|null} [dataToSign]
 * @param {String|null} [authSrvFqdn]
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {String|null} [localIp]
 * @param {Function} callback
 */
function signAndCreate(signWithFqdn, dataToSign, authSrvFqdn, name, email, localIp, callback) {
	var cred = new (require('../services/Credential'))(store2);

	cred.signWithFqdn(signWithFqdn, dataToSign).then(authToken=> {
		createWithToken(authToken, authSrvFqdn, name, email, localIp, callback);
	}).catch(error=> {
		callback && callback(error, null)
	})
}
signAndCreate.toText = lineToText;

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
		if (beameUtils.isObject(line[k])) {
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
	/** @type {SignatureToken} **/
	var parsedData = JSON.parse(data);

	//noinspection JSCheckFunctionSignatures
	var signatureStatus = crypto.checkSignature(parsedData.signedData, parsedData.signedData.signedBy, parsedData.signature);
	if (signatureStatus === true) {
		var creds = store.search(parsedData.signedData.encryptedFor)[0];

		if (!creds) {
			logger.fatal(`Private key for ${parsedData.signedData.encryptedFor} is not found`);
		}
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		return crypto.decrypt(JSON.stringify(parsedData.signedData.data));
	}
}


/** public methods **/

/**
 * Return list of credentials
 * @private
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array<CredsListItem>}
 */
function listCreds(fqdn) {
	return store2.list(fqdn);
	//let result = store2.search('sg2iaxrk9sknvmvo.v266jyyar140ozwo.v1.beameio.net');
	//return returnValues;
}

/**
 * Return list of certificate properties
 * @public
 * @method Creds.show
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array.<CertListItem>}
 */
function show(fqdn) {

	var creds = store2.getCredential(fqdn);
	if (!creds) {
		throw new Error(`show: fqdn ${fqdn} was not found`);
	}

	return creds.metadata;
}

show.toText = lineToText;

/**
 * Return list of credentials
 * @public
 * @method Creds.list
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array.<CredsListItem>}
 */
function list(regex) {
	logger.debug(`list  ${regex}`);
	return listCreds(regex || '.' );
}

list.toText = function (creds) {
	var table = new Table({
		head:      ['name', 'fqdn', 'parent', 'priv/k'],
		colWidths: [40, 65, 55, 10]
	});
	creds.forEach(item => {
		table.push([item.getMetadataKey("Name"), item.fqdn, item.getMetadataKey('PARENT_FQDN'), item.getKey('PRIVATE_KEY') ? 'Y' : 'N']);
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
function registerDeveloper(developerName, developerEmail, callback) {
//	developerServices.registerDeveloper(developerName, developerEmail, callback);
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
			signedBy:     fqdn,
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

			var bas64Str = new Buffer(cert.raw, "hex").toString("base64");

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
	new Error('not implemented');
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

}

function convertCredentialsToV2() {
	let creds = store.list();
	for (let cred of creds) {
		let rec          = store.search(cred.hostname)[0];
		let pathElements = rec.path.split(path.sep);
		let lastElement  = pathElements[pathElements.length - 1];
		let newPath      = path.join(config.localCertsDirV2, lastElement);
		directoryServices.copyDir(rec.path, newPath);
		let metafilePath = path.join(newPath, config.metadataFileName);

		if (directoryServices.doesPathExists(metafilePath)) {
			let metadata = directoryServices.readJSON(metafilePath);
			if (metadata.hostname) {
				metadata.fqdn = metadata.hostname;
				delete metadata.hostname;
			}
			let jsonData = JSON.stringify(metadata);
			fs.writeFileSync(path.join(metafilePath), jsonData);
		}

		directoryServices.deleteFolder(rec.path, () => {
		});
		logger.info(`copying ${rec.path} to ${newPath}`);
	}
	console.log(`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@`);




}


