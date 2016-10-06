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

const config      = require('../../config/Config');
const module_name = config.AppModules.BeameCreds;
const BeameLogger = require('../utils/Logger');
const logger      = new BeameLogger(module_name);
const CommonUtils = require('../utils/CommonUtils');
const BeameStore  = require("../services/BeameStoreV2");

const path = require('path');
const fs   = require('fs');

module.exports = {
	show,
	list,
	getCreds,
	updateMetadata,
	shred,
	exportCredentials,
	importCredentials,
	importLiveCredentials,
	encrypt,
	decrypt,
	sign,
	checkSignature
};

/**
 * @param {String} [token]
 * @param {String|null} [authSrvFqdn]
 * @param {String} [fqdn]
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {Function} callback
 */
function getCreds(token, authSrvFqdn, fqdn, name, email, callback) {

	if (!token && !fqdn) {
		logger.fatal(`Auth TOken or Fqdn required`);
		return;
	}

	const store = new BeameStore();

	let cred = new (require('../services/Credential'))(store);


	if (token) {
		let authToken = CommonUtils.parse(new Buffer(token, 'base64').toString());

		CommonUtils.promise2callback(cred.createEntityWithAuthServer(authToken, authSrvFqdn, name, email), callback);
	}
	else {
		CommonUtils.promise2callback(cred.createEntityWithLocalCreds(parent_fqdn, name, email), callback);
	}


}
getCreds.toText = lineToText;



function updateMetadata(fqdn, name, email, callback) {
	const store = new BeameStore();

	let cred = new (require('../services/Credential'))(store);

	CommonUtils.promise2callback(cred.updateMetadata(fqdn, name, email), callback);
}
updateMetadata.toText = lineToText;

/** private helpers and services **/

/**
 * @private
 * @param line
 * @returns {*}
 */
function lineToText(line) {
	let table = new Table();
	for (let k in line) {
		//noinspection JSUnfilteredForInLoop
		table.push({[k]: line[k].toString()});
	}

	return table;
}

//noinspection JSUnusedLocalSymbols
/**
 * @private
 * @param line
 * @returns {string}
 */
function objectToText(line) {
	let line2 = {};
	Object.keys(line).forEach(k => {
		if (CommonUtils.isObject(line[k])) {
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
 * Return list of credentials
 * @private
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array<CredsListItem>}
 */
function listCreds(fqdn) {
	const store = new BeameStore();
	return store.list(fqdn, {});
}

/**
 * Return list of certificate properties
 * @public
 * @method Creds.show
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array.<CertListItem>}
 */
function show(fqdn) {
	const store = new BeameStore();
	let creds   = store.getCredential(fqdn);
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
 * @param {String|null} [regex] entity fqdn
 * @returns {Array.<CredsListItem>}
 */
function list(regex) {
	logger.debug(`list  ${regex}`);
	return listCreds(regex || '.');
}

list.toText = function (creds) {
	let table = new Table({
		head:      ['name', 'fqdn', 'parent', 'priv/k'],
		colWidths: [40, 65, 55, 10]
	});
	creds.forEach(item => {
		table.push([item.getMetadataKey("Name"), item.fqdn, item.getMetadataKey('PARENT_FQDN'), item.getKey('PRIVATE_KEY') ? 'Y' : 'N']);
	});
	return table;
};

function shred(fqdn) {
	const store = new BeameStore();
	if (!fqdn) {
		logger.fatal("FQDN is required in shred");
	}
	store.shredCredentials(fqdn, () => {
		return 'fqdn has been erased from store';
	});
}

shred.toText = lineToText;


/**
 * Export credentials from source fqdn to target fqdn
 * @public
 * @method Creds.exportCredentials
 * @param {String} fqdn - fqdn of credentials to export
 * @param {String} targetFqdn - fqdn of the entity to encrypt for
 * @param {String} signingFqdn
 * @param {String} file - path to file
 * @returns {String|null}
 */

function exportCredentials(fqdn, targetFqdn, signingFqdn, file) {
	const store = new BeameStore();

	let creds = store.getCredential(fqdn);
	if (creds && targetFqdn) {
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let jsonCredentialObject = JSON.stringify(creds);
		if (!jsonCredentialObject) {
			logger.fatal(`Credentials for exporting ${fqdn} credentials are not found`);
		}

		let crypto = require('./crypto');
		let encryptedString;
		try {
			encryptedString = crypto.encrypt(jsonCredentialObject, targetFqdn, signingFqdn);
		} catch (e) {
			logger.error(`Could not encrypt with error `, e);
			return null;
		}

		if (!file) {
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			console.log(JSON.stringify(encryptedString));
		}
		else {
			let p = path.resolve(file);
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			fs.writeFileSync(p, JSON.stringify(encryptedString));
			return p;
		}
	}
}

/**
 * Import credentials exported with exportCredentials method
 * @public
 * @method Creds.importCredentials
 * @param {String|null} [file] - path to file with encrypted credentials
 * @returns {String}
 */
function importCredentials(file) {
	const store = new BeameStore();
	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	let data    = JSON.parse(fs.readFileSync(path.resolve(file)) + "");
	let creds   = new (require('../services/Credential'))(store);
	let encryptedCredentials;

	if (data.signature) {
		let sigStatus = creds.checkSignatureToken(data);
		console.log(`Signature status is ${sigStatus}`);
		if (!sigStatus) {
			logger.fatal(`Import credentials signature missmatch ${data.signedBy}, ${data.signature}`);
		}
		encryptedCredentials = data.signedData;
	} else {
		encryptedCredentials = data;
	}
	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	let decrtypedCreds = crypto.decrypt(JSON.stringify(encryptedCredentials));

	if (decrtypedCreds && decrtypedCreds.length) {
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let parsedCreds = JSON.parse(decrtypedCreds);

		let importedCredential = new (require('../services/Credential.js'))(store);
		importedCredential.initFromObject(parsedCreds);
		importedCredential.saveCredentialsObject();
		return `Successfully imported credentials ${importedCredential.fqdn}`;
	}
}

/**
 * XXX TODO: use URL not FQDN as parameter
 * Import non Beame credentials by fqdn and save to to ./beame/v{}/remote
 * @public
 * @method Creds.importNonBeameCredentials
 * @param {String} fqdn
 */
function importLiveCredentials(fqdn) {
	const store = new BeameStore();
	let tls     = require('tls');
	try {
		let ciphers           = tls.getCiphers().filter(cipher => {
			return cipher.indexOf('ec') < 0;

		});
		let allowedCiphers    = ciphers.join(':').toUpperCase();
		let conn              = tls.connect(443, fqdn, {host: fqdn, ciphers: allowedCiphers});
		let onSecureConnected = function () {
			//noinspection JSUnresolvedFunction
			let cert = conn.getPeerCertificate(true);
			conn.end();
			let bas64Str    = new Buffer(cert.raw, "hex").toString("base64");
			let certBody    = "-----BEGIN CERTIFICATE-----\r\n";
			certBody += bas64Str.match(/.{1,64}/g).join("\r\n") + "\r\n";
			certBody += "-----END CERTIFICATE-----";
			let credentials = store.addToStore(certBody);
			credentials.saveCredentialsObject();
		};

		conn.on('error', function (error) {
			let msg = error && error.message || error.toString();
			logger.fatal(msg);
		});

		conn.once('secureConnect', onSecureConnected);

	}
	catch (e) {
		logger.fatal(e.toString());
	}

}


/**
 * Encrypts given data for the given entity. Only owner of that entity's private key can open it. You must have the public key of the fqdn to perform the operation.
 * @public
 * @method Crypto.encrypt
 * @param {String} data - data to encrypt
 * @param {String} fqdn - entity to encrypt for
 * @param {String} signingFqdn
 */
function encrypt(data, fqdn, signingFqdn) {
	const store          = new BeameStore();
	let targetCredential = store.getCredential(fqdn);
	if (!targetCredential) {
		throw new Error(`Could not find target credential (public key to encrypt for)`);
	}
	return targetCredential.encrypt(fqdn, data, signingFqdn);
}


/**
 * Decrypts given data. You must have the private key of the entity that the data was encrypted for.
 * @public
 * @method Crypto.decrypt
 * @param {String} data - data to encrypt
 */
function decrypt(data) {
	const store = new BeameStore();
	try {
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		/** @type {Object} */
		let encryptedMessage = JSON.parse(data);
		if (!encryptedMessage.encryptedFor && !encryptedMessage.signature) {
			logger.fatal("Decrypting a wrongly formatted message", data);
		}
		//noinspection JSUnresolvedVariable
		let targetFqdn = encryptedMessage.encryptedFor || encryptedMessage.signedData.encryptedFor;
		let credential = store.getCredential(targetFqdn);
		return credential.decrypt(encryptedMessage);
	} catch (e) {
		logger.fatal("decrypt error ", e);
		return null;
	}
}

/**
 * Signs given data. You must have private key of the fqdn.
 * @public
 * @method Crypto.sign
 * @param {String} data - data to sign
 * @param {String} fqdn - sign as this entity
 * @returns {SignatureToken|null}
 */
function sign(data, fqdn) {
	const store = new BeameStore();
	let element = store.getCredential(fqdn);
	if (element) {
		return element.sign(data);
	}
	logger.error("sign data with fqdn, element not found ");
	return null;
}

/**
 * Checks signature.
 * @public
 * @method Crypto.checkSignature
 * @param {String} data - signed data
 * @param {String} fqdn - check signature that was signed as this entity
 * @param {String|null} signature
 */
function checkSignature(data, fqdn, signature) {
	const store = new BeameStore();
	let cred    = store.getCredential(fqdn);
	return cred ? cred.checkSignatureToken({signedData: data, signedBy: fqdn, signature}) : null;
}

