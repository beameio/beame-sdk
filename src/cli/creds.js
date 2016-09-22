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

const config            = require('../../config/Config');
const module_name       = config.AppModules.BeameCreds;
const BeameLogger       = require('../utils/Logger');
const logger            = new BeameLogger(module_name);
const directoryServices = new (require('../services/DirectoryServices'))();
const beameUtils        = require('../utils/BeameUtils');
const CommonUtils            = require('../utils/CommonUtils');


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
	importLiveCredentials,
	stats,
	convertCredentialsToV2
};

/**
 *
 * @param {String} authToken
 * @param {String|null} [authSrvFqdn]
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {String|null} [localIp]
 * @param {Function} callback
 */
function createWithToken(authToken, authSrvFqdn, name, email, localIp, callback) {
	const store2            = new (require("../services/BeameStoreV2"))();

	let cred = new (require('../services/Credential'))(store2);

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
	const store2            = new (require("../services/BeameStoreV2"))();

	let cred = new (require('../services/Credential'))(store2);

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
function signAndCreate(signWithFqdn,  authSrvFqdn, dataToSign, name, email, localIp, callback) {
	const store2            = new (require("../services/BeameStoreV2"))();

	let cred = new (require('../services/Credential'))(store2);

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
	let table = new Table();
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

//noinspection JSUnusedLocalSymbols
/**
 * @private
 * @param {Function} callback
 */
function readStdinStream(callback) {
	let stdin       = process.stdin,
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

//noinspection JSUnusedLocalSymbols
/**
 * @private
 * @param {String} data
 * @returns {*}
 */
function decryptCreds(data) {
	let crypto     = require('./crypto');
	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	/** @type {SignatureToken} **/
	let parsedData = JSON.parse(data);

	//noinspection JSCheckFunctionSignatures
	let signatureStatus = crypto.checkSignature(parsedData.signedData, parsedData.signedData.signedBy, parsedData.signature);
	if (signatureStatus === true) {
		let creds = store.search(parsedData.signedData.encryptedFor)[0];

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
}

/**
 * Return list of certificate properties
 * @public
 * @method Creds.show
 * @param {String|null} [fqdn] entity fqdn
 * @returns {Array.<CertListItem>}
 */
function show(fqdn) {
	let creds = store2.getCredential(fqdn);
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
	return listCreds(regex || '.' );
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

function shred(fqdn, callback) {
	if (!fqdn) {
		logger.fatal("FQDN is required in shred");
	}
	store2.shredCredentials(fqdn,() =>{
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
 * @param {String} file - path to file
 * @returns {{}}
 */

function exportCredentials(fqdn, targetFqdn, signingFqdn, file) {
	const store2            = new (require("../services/BeameStoreV2"))();

	let creds        = store2.getCredential(fqdn);
	if(creds && targetFqdn){
		let jsonCredentialObject = JSON.stringify(creds);
		if (!jsonCredentialObject) {
			logger.fatal(`Credentials for exporting ${fqdn} credentials are not found`);
			return;
		}

		let crypto = require('./crypto');
		let encryptedString;
		try {
			encryptedString = crypto.encrypt(jsonCredentialObject, targetFqdn, signingFqdn);
		} catch (e) {
			logger.error(`Could not encrypt with error `, e);
			return {};
		}

		if (!file) {
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
 * @param {String|null} [data] - encrypted credentials in string format
 * @param {String|null} [file] - path to file with encrypted credentials
 * @returns {boolean}
 */
function importCredentials(file) {
	const store2            = new (require("../services/BeameStoreV2"))();
	let data           = JSON.parse(fs.readFileSync(path.resolve(file)) + "");
	let crypto = require('./crypto');
	let encryptedCredentials;

	if(data.signature ){
		let sigStatus = crypto.checkSignature(data.signedData, data.signedBy, data.signature);
		console.log(`Signature status is ${sigStatus}`);
		if(!sigStatus){
			logger.fatal(`Import credentials signature missmatch ${data.signedBy}, ${data.signature}`);
		}
		encryptedCredentials = data.signedData;
	}else{
		encryptedCredentials = data;
	}
	let decrtypedCreds = crypto.decrypt(JSON.stringify(encryptedCredentials));

	if(decrtypedCreds && decrtypedCreds.length){
		let parsedCreds = JSON.parse(decrtypedCreds);

		let importedCredential = new (require('../services/Credential.js'))(store2);
		importedCredential.initFromObject(parsedCreds);
		importedCredential.saveCredentialsObject();
		return `Succesfully imported credentials ${importedCredential.fqdn}`;
	}
}

/**
 * Import non Beame credentials by fqdn and save to to ./beame/v{}/remote
 * @public
 * @method Creds.importNonBeameCredentials
 * @param {String} fqdn
 */
function importLiveCredentials(fqdn) {
	let tls = require('tls');
	try {
		let ciphers = tls.getCiphers().filter(cipher => {
			if(cipher.indexOf('ec') >= 0){
				return false;
			}
			return true;
		});
		let allowedCiphers = ciphers.join(':').toUpperCase();
		let conn = tls.connect(443, fqdn, {host: fqdn, ciphers:allowedCiphers});
		let onSecureConnected = function () {
			//noinspection JSUnresolvedFunction
			let cert = conn.getPeerCertificate(true);
			conn.end();
			let bas64Str = new Buffer(cert.raw, "hex").toString("base64");
			let certBody = "-----BEGIN CERTIFICATE-----\r\n";
			certBody += bas64Str.match(/.{1,64}/g).join("\r\n") + "\r\n";
			certBody += "-----END CERTIFICATE-----";
			let credentials = store2.addToStore(certBody);
//			credentials.saveCredentialsObject();
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

	let creds = store2.getCredential(fqdn);

	if (!creds) {
		logger.fatal("FQDN not found");
	}

	let cb = function (error, payload) {
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

	let creds = store2.getCredential(fqdn);
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


