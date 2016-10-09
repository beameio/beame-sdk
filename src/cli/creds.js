"use strict";
/** @namespace Creds **/

const Table = require('cli-table2');

require('../../initWin');

const config      = require('../../config/Config');
const module_name = config.AppModules.BeameCreds;
const BeameLogger = require('../utils/Logger');
const logger      = new BeameLogger(module_name);
const CommonUtils = require('../utils/CommonUtils');
const BeameStore  = require("../services/BeameStoreV2");
const Credential  = require('../services/Credential');
const path        = require('path');
const fs          = require('fs');

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
 * AuthToken(token) or Local Credential(fqdn) required
 * @param {String|null} [token]
 * @param {String|null} [authSrvFqdn]
 * @param {String|null} [fqdn]
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {Function} callback
 */
function getCreds(token, authSrvFqdn, fqdn, name, email, callback) {

	if (!token && !fqdn) {
		logger.fatal(`Auth Token or Fqdn required`);
		return;
	}

	let cred      = new Credential(new BeameStore()),
	    authToken = token ? CommonUtils.parse(token) : null,
	    promise   = token ? cred.createEntityWithAuthServer(authToken, authSrvFqdn, name, email) : cred.createEntityWithLocalCreds(fqdn, name, email);

	CommonUtils.promise2callback(promise, callback);

}
getCreds.toText = lineToText;

/**
 *
 * @param {String} fqdn
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {Function} callback
 */
function updateMetadata(fqdn, name, email, callback) {
	let cred = new Credential(new BeameStore());

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

/**
 * Return list of credentials
 * @private
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array<Credential>}
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
 * @returns {Array.<Credential>}
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
 * @returns {Array.<Credential>}
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
	if (!targetFqdn) {
		logger.fatal(`target fqdn required`);
	}

	const store = new BeameStore();

	let creds = store.getCredential(fqdn);

	if (creds) {
		let jsonCredentialObject = CommonUtils.stringify(creds, false);
		try {
			encrypt(jsonCredentialObject, targetFqdn, signingFqdn, (error, payload)=> {
				if (payload) {
					if (!file) {
						return payload;
					}

					let p = path.resolve(file);
					fs.writeFileSync(p, payload);
					return p;

				}
				logger.fatal(`encryption failed`);
			});
		} catch (e) {
			logger.fatal(`Could not encrypt with error `, e);
		}
	}
	else {
		logger.fatal(`Credentials for ${fqdn} not found`);
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


	let data = CommonUtils.parse(fs.readFileSync(path.resolve(file)) + "");

	function _import(encryptedCredentials) {
		let decryptedCreds = decrypt(CommonUtils.stringify(encryptedCredentials, false));

		if (decryptedCreds && decryptedCreds.length) {

			let parsedCreds = CommonUtils.parse(decryptedCreds);

			let importedCredential = new Credential(store);
			importedCredential.initFromObject(parsedCreds);
			importedCredential.saveCredentialsObject();
			return `Successfully imported credentials ${importedCredential.fqdn}`;
		}
	}

	if (data.signedBy && data.signature) {
		store.find(data.signedBy).then(signingCreds=> {
				let encryptedCredentials;

				if (data.signature) {
					let sigStatus = signingCreds.checkSignatureToken(data);
					console.log(`Signature status is ${sigStatus}`);
					if (!sigStatus) {
						logger.fatal(`Import credentials signature mismatch ${data.signedBy}, ${data.signature}`);
					}
					encryptedCredentials = data.signedData;
				} else {
					encryptedCredentials = data;
				}

				return _import(encryptedCredentials);

			}
		).catch(error=> {
			logger.error(error);
			logger.fatal(`signing creds ${data.signedBy} not found`);
		});
	}
	else {
		return _import(data.signature || data);
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
 * @method Creds.encrypt
 * @param {String|Object} data - data to encrypt
 * @param {String} targetFqdn - entity to encrypt for
 * @param {String} signingFqdn
 * @param {Function} callback
 */
function encrypt(data, targetFqdn, signingFqdn, callback) {

	if(typeof data != 'string') {
		throw new Error("encrypt(): data must be string");
	}

	function _encrypt() {
		return new Promise((resolve, reject) => {
				const store = new BeameStore();
				store.find(targetFqdn).then(targetCredential=> {
					resolve(targetCredential.encrypt(targetFqdn, data, signingFqdn));
				}).catch(reject);
			}
		);
	}

	CommonUtils.promise2callback(_encrypt(), callback);
}
encrypt.toText = x=>x;

/**
 * Decrypts given data. You must have the private key of the entity that the data was encrypted for.
 * @public
 * @method Creds.decrypt
 * @param {String} data - data to encrypt
 */
function decrypt(data) {
	const store = new BeameStore();
	try {

		/** @type {EncryptedMessage} */
		let encryptedMessage = CommonUtils.parse(data);

		if (!encryptedMessage) {
			logger.fatal(`invalid data: ${data}`);
		}

		logger.debug('message token parsed', encryptedMessage);
		if (!encryptedMessage.encryptedFor) {
			logger.fatal("Decrypting a wrongly formatted message", data);
		}

		let targetFqdn = encryptedMessage.encryptedFor;
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
 * @method Creds.sign
 * @param {String} data - data to sign
 * @param {String} fqdn - sign as this entity
 * @returns {String|null}
 */
function sign(data, fqdn) {
	const store = new BeameStore();
	let cred    = store.getCredential(fqdn);
	if (cred) {
		let token = cred.sign(data);

		return new Buffer(CommonUtils.stringify(token, false)).toString('base64');
	}
	logger.error("sign data with fqdn, element not found ");
	return null;
}
sign.toText = x=>x;
/**
 * Checks signature.
 * @public
 * @method Creds.checkSignature
 * @param {String} data => based64 encoded Signature Token
 * @param {Function} callback
 */
function checkSignature(data, callback) {


	function _checkSignature(data) {
		return new Promise((resolve, reject) => {

				if (!data) {
					reject(`Data required`);
					return;
				}

				try {
					const store = new BeameStore();
					/** @type {SignatureToken} */
					var token   = CommonUtils.parse(new Buffer(data, 'base64').toString());

					if (!token) {
						logger.error(`invalid signature data`);
						reject();
						return;
					}

					logger.debug(`token parsed`, token);

					store.find(token.signedBy).then(cred=> {
						let status = cred.checkSignatureToken(token);
						resolve(`signature verification status is ${status}`);
					}).catch(error=> {
						logger.error(`Credential ${token.signedBy} not found`);
						reject(error);
					});
				}
				catch (error) {
					let e = BeameLogger.formatError(error);
					logger.error(e);
					reject(e);
				}
			}
		);
	}

	CommonUtils.promise2callback(_checkSignature(data), callback);

}
