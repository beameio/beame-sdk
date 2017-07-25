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
const AuthToken   = require('../services/AuthToken');
const path        = require('path');
const fs          = require('fs');
const colors      = require('colors');

module.exports = {
	show,
	list,
	signers,
	getCreds,
	getRegToken,
	updateMetadata,
	shred,
	exportCredentials,
	importCredentials,
	importLiveCredentials,
	encrypt,
	decrypt,
	sign,
	checkSignature,
	revokeCert,
	revoke,
	renewCert,
	renew,
	checkOcsp,
	setDns,
	deleteDns,
	listCredChain,
	verifyAncestry
};


//region private methods and helpers
/**
 * @private
 * @param line
 * @returns {*}
 */
function _lineToText(line) {
	let table = new Table();
	for (let k in line) {
		//noinspection JSUnfilteredForInLoop
		table.push({[k]: line[k] ? line[k].toString() : null});

	}

	return table;
}

/**
 *
 * @param o
 * @returns {String|*|string}
 * @private
 */
function _obj2base64(o) {
	return Buffer(CommonUtils.stringify(o, false)).toString('base64');
}

/**
 * Return list of credentials
 * @private
 * @param {String|null} [regex] entity regex
 * @param {Object} options
 * @returns {Array<Credential>}
 */
function _listCreds(regex, options) {
	const store = new BeameStore();
	return store.list(regex, options);
}
//endregion

//region Entity management
/**
 *
 * @param {Object}token
 * @param [validityPeriod]
 * @returns {*}
 * @private
 */
const _getCreds = (token, validityPeriod) => {

	let cred = new Credential(new BeameStore());

	return cred.createEntityWithRegistrationToken(token, validityPeriod);

};
/**
 * Get credentials with Auth Token or for existing local Credential by fqdn
 * AuthToken(token) or Local Credential(fqdn) required
 * @public
 * @method Creds.getCreds
 * @param {Object|null} [regToken]
 * @param {String|null} [token]
 * @param {String|null} [fqdn]
 * @param {String|null} [authSrvFqdn]
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {Number|null} [validityPeriod] cert validity period in seconds
 * @param {Function} callback
 */

function getCreds(regToken, token, authSrvFqdn, fqdn, name, email, validityPeriod, callback) {

	if (!token && !fqdn && !regToken) {
		logger.fatal(`Auth Token or Fqdn required`);
		return;
	}

	let promise,
	    cred            = new Credential(new BeameStore()),
	    parsedToken     = token ? CommonUtils.parse(token) : null,
	    parsedAuthToken = regToken ? CommonUtils.parse(regToken) : null;

	if (parsedAuthToken) {
		promise = _getCreds(parsedAuthToken, validityPeriod);
	}
	else if (parsedToken) {
		promise = cred.createEntityWithAuthServer(parsedToken, authSrvFqdn, name, email, validityPeriod);
	}
	else if (fqdn) {
		promise = cred.createEntityWithLocalCreds(fqdn, name, email, validityPeriod);
	}

	CommonUtils.promise2callback(promise, callback);
}
getCreds.toText = _lineToText;

/**
 * @param fqdn
 * @param {String|null|undefined} [name]
 * @param {String|null|undefined} [email]
 * @param {String|null|undefined} [userId]
 * @param {Number|null|undefined} [ttl]
 * @param {String|null|undefined} [src]
 * @param {String|null|undefined} [serviceName]
 * @param {String|null|undefined} [serviceId]
 * @param {String|null|undefined} [matchingFqdn]
 * @param {Function} callback
 */
function getRegToken(fqdn, name, email, userId, ttl, src, serviceName, serviceId, matchingFqdn, callback) {
	if (!fqdn) {
		logger.fatal(`Fqdn required`);
		return;
	}

	function _get() {
		return new Promise((resolve, reject) => {

				let cred = new Credential(new BeameStore());

				cred.createRegistrationToken({
					fqdn,
					name,
					email,
					userId,
					ttl,
					src,
					serviceName,
					serviceId,
					matchingFqdn
				}).then(resolve).catch(reject);
			}
		);
	}

	CommonUtils.promise2callback(_get(), callback);

}
getRegToken.toText = x => x;


/**
 * @public
 * @method Creds.updateMetadata
 * @param {String} fqdn
 * @param {String|null} [name]
 * @param {String|null} [email]
 * @param {Function} callback
 */
function updateMetadata(fqdn, name, email, callback) {
	let cred = new Credential(new BeameStore());

	CommonUtils.promise2callback(cred.updateMetadata(fqdn, name, email), callback);
}
updateMetadata.toText = _lineToText;


/**
 * @public
 * @method Creds.renewCert
 * @param {String} signerAuthToken
 * @param {String} fqdn
 * @param {Number|null} [validityPeriod] cert validity period in seconds
 * @param {String} filter
 * @param {String} regex
 * @param {Function} callback
 */
function renewCert(signerAuthToken, fqdn, validityPeriod, filter, regex, callback) {
	renew(signerAuthToken, fqdn, validityPeriod, filter, regex, callback);
}

/**
 * @public
 * @method Creds.renew
 * @param {String} signerAuthToken
 * @param {String} fqdn
 * @param {Number|null} [validityPeriod] cert validity period in seconds
 * @param {String} filter
 * @param {String} regex
 * @param {Function} callback
 */
function renew(signerAuthToken, fqdn, validityPeriod, filter, regex, callback) {
	let credList = [];
	let listMaxIndex = 0, listIndex = 0;
	function _renew(authToken) {
		const fqdnX = credList[listIndex++];
		let cred = new Credential(new BeameStore());
		logger.info(`Trying to renew ${fqdnX}`);
		function returnOK() {
			return Promise.resolve({status: 'ok'});
		}

		listIndex >= listMaxIndex?
			CommonUtils.promise2callback(cred.renewCert(authToken, fqdnX, validityPeriod), callback):
			cred.renewCert(authToken, fqdnX, validityPeriod)
				.then(()=>{
				logger.info(`${fqdnX} renew - done`);
				_renew();
		}).catch(e=>{
			logger.info(`${fqdnX} renew - failed: ${e}`);
			_renew();
		});
	}

	if ((!signerAuthToken && !filter && !regex && !fqdn) || ((filter || regex) && (signerAuthToken || fqdn))) {
		logger.fatal(`Define valid criteria to select creds for renew, use: signerAuthToken && fqdn || fqdn || filter || regex || filter && regex`);
	}

	let authToken = null;

	if (signerAuthToken) {
		let parsed = CommonUtils.parse(signerAuthToken, false);

		if (typeof parsed === "object") {
			authToken = parsed;
		}
		else {
			authToken = CommonUtils.parse(parsed, false);
		}
	}

	if(filter || regex){
		credList = getFqdnListByFilter(filter, regex, true);
	}
	else credList[0] = fqdn;
	listMaxIndex = credList.length>3?3:credList.length;

	_renew(authToken, credList[0]);


}
renew.toText = _lineToText;

/**
 * @public
 * @method Creds.revokeCert
 * @param {String|null} [signerAuthToken]
 * @param {String|null} [signerFqdn]
 * @param {String} fqdn
 * @param {Function} callback
 */
function revokeCert(signerAuthToken, signerFqdn, fqdn, callback) {
	revoke(signerAuthToken, signerFqdn, fqdn, callback);
}

/**
 * @public
 * @method Creds.revoke
 * @param {String|null} [signerAuthToken]
 * @param {String|null} [signerFqdn]
 * @param {String} fqdn
 * @param {Function} callback
 */
function revoke(signerAuthToken, signerFqdn, fqdn, callback) {

	if (!signerAuthToken && !signerFqdn) {
		throw new Error(`signerAuthToken or signerFqdn required`);
	}

	if (!fqdn) {
		throw new Error(`Fqdn required`);
	}

	let authToken;

	if (signerAuthToken) {
		let parsed = CommonUtils.parse(signerAuthToken, false);

		if (typeof parsed == "object") {
			authToken = parsed;
		}
		else {
			authToken = CommonUtils.parse(parsed, false);
		}
	}

	let cred = new Credential(new BeameStore());

	CommonUtils.promise2callback(cred.revokeCert(authToken, signerFqdn, fqdn), callback);
}
revoke.toText = _lineToText;

/**
 * @public
 * @method Creds.checkOcsp
 * @param {String} fqdn
 * @param {Boolean|null} [forceCheck] => ignoring cache, when set to true
 * @param {Function} callback
 */
function checkOcsp(fqdn, forceCheck, callback){
	if (!fqdn) {
		throw new Error(`Fqdn required`);
	}

	let cred = (new BeameStore()).getCredential(fqdn);

	if(!cred){
		throw new Error(`Credential for ${fqdn} not found`);
	}

	let check = !!(forceCheck && forceCheck === "true");

	CommonUtils.promise2callback(cred.checkOcspStatus(cred,check), callback);
}
checkOcsp.toText = x => {
	return x.status === true ? `Certificate ${x.fqdn} is valid` : x.message;
};
/**
 * @public
 * @method Creds.setDns
 * @param {String} fqdn
 * @param {String|null|undefined} [value] => dns record value
 * @param {Boolean|null} [useBestProxy]
 * @param {String|null|undefined} [dnsFqdn] => using for any alt-names which is not CN
 * @param callback
 */
function setDns(fqdn, value, useBestProxy, dnsFqdn, callback) {
	let cred = new Credential(new BeameStore());

	CommonUtils.promise2callback(cred.setDns(fqdn, value, useBestProxy || !value, dnsFqdn), callback);

}
setDns.toText = x => `DNS set to ${x}`;

/**
 * @public
 * @method Creds.deleteDns
 * @param {String} fqdn
 * @param {String|null|undefined} [dnsFqdn] => using for any alt-names which is not CN
 * @param callback
 */
function deleteDns(fqdn, dnsFqdn, callback) {
	let cred = new Credential(new BeameStore());

	CommonUtils.promise2callback(cred.deleteDns(fqdn, dnsFqdn), callback);

}
deleteDns.toText = x => `DNS record for ${x} has been deleted`;
//endregion

//region list/show/shred functions
/**createEntityWithLocalCreds
 * Return list of certificate properties
 * @public
 * @method Creds.show
 * @param {String} fqdn
 * @returns {Object}
 */
function show(fqdn) {
	const store = new BeameStore();
	//noinspection JSDeprecatedSymbols
	let creds   = store.getCredential(fqdn);
	if (!creds) {
		throw new Error(`show: fqdn ${fqdn} was not found`);
	}
	return creds.metadata;
}

show.toText = _lineToText;

/**
 * Return list of credentials
 * @public
 * @method Creds.list
 * @param {String|null} [regex] entity fqdn
 * @param {Boolean|null} hasPrivateKey
 * @param {Number|null} expiration in days
 * @param {Boolean|null} anyParent
 * @param {string} [filter]
 * @returns {Array.<Credential>}
 */
function list(regex, hasPrivateKey, expiration, anyParent, filter) {
	logger.debug(`list  ${regex}`);
	let options = {
		hasPrivateKey: hasPrivateKey ? hasPrivateKey == 'true' : null,
		expiration:    expiration ? Number(expiration) : (expiration === 0 ? 0 : null),
		anyParent:     anyParent || null,
		excludeActive: filter === 'expired',
		excludeValid: filter === 'revoked'
	};
	return _listCreds(regex || '.', options);
}

list.toText = function (creds) {
	let table = new Table({
		head:      ['name', 'fqdn', 'parent', 'Expires', 'priv/k'],
		colWidths: [40, 65, 55, 25, 10]
	});

	const _setStyle = (value, cred) => {
		let val = value || '';
		return cred.expired === true ? colors.red(val) : val;
	};

	creds.forEach(item => {

		table.push([_setStyle(item.getMetadataKey("Name"), item), _setStyle(item.fqdn, item), _setStyle(item.getMetadataKey('PARENT_FQDN'), item), _setStyle(item.getCertEnd(), item), _setStyle(item.getKey('PRIVATE_KEY') ? 'Y' : 'N', item)]);
	});
	return table;
};

function signers(callback){
	const store = new BeameStore();

	CommonUtils.promise2callback(store.getActiveLocalCreds(), callback);
}
signers.toText =  function (creds) {
	let table = new Table({
		head:      ['name', 'fqdn'],
		colWidths: [120, 120]
	});

	const _setStyle = (value, cred) => {
		let val = value || '';
		return cred.expired === true ? colors.red(val) : val;
	};

	creds.forEach(item => {

		table.push([_setStyle(item.name, item), _setStyle(item.fqdn, item)]);
	});
	return table;
};

function getFqdnListByFilter(filter, regex, hasPrivateKey) {
	let options = {
		excludeActive: filter === 'expired',
		excludeValid: filter === 'revoked'
	};
	let tmpList = _listCreds(regex || '.', options);
	let credList = [];
	for(let j=0; j < tmpList.length; j++){
		if(tmpList[j].hasKey('PRIVATE_KEY'))
			console.log(j,': ',tmpList[j].fqdn,' revoked => ',tmpList[j].metadata.revoked, ',expired => ', tmpList[j].expired);
		if(hasPrivateKey && tmpList[j].hasKey('PRIVATE_KEY') || !hasPrivateKey)
			tmpList[j].fqdn && credList.push(tmpList[j].fqdn);
	}
	return credList;
}

/**
 * Delete local credential folder
 * @public
 * @method Creds.shred
 * @param {String} fqdn
 * @param {String} filter
 * @param {String} regex
 */
function shred(fqdn, filter, regex) {
	if (!fqdn && !filter && !regex || (fqdn && (filter || regex))) {
		logger.fatal("shred valid parameters are: fqdn || filter || regex || regex && filter");
	}
	let credList = [];
	if(filter || regex){
		credList = getFqdnListByFilter(filter, regex);
	}
	else credList[0] = fqdn;
	const store = new BeameStore();
	for(let i=0; i<credList.length; i++){
		store.shredCredentials(credList[i], () => {
			logger.info(`${credList[i]} has been erased from store`);
		});
	}
	return 'ok';
}
shred.toText = _lineToText;

//endregion

//region Export/Import
/**
 * Export credentials from source fqdn to target fqdn
 * @public
 * @method Creds.exportCredentials
 * @param {String} fqdn - fqdn of credentials to export
 * @param {String} targetFqdn - fqdn of the entity to encrypt for
 * @param {String|null} [signingFqdn]
 * @param {String} file - path to file
 * @param {Function} callback
 */
function exportCredentials(fqdn, targetFqdn, signingFqdn, file, callback) {

	if (!fqdn) {
		logger.fatal(`fqdn required`);
	}

	if (!targetFqdn) {
		logger.fatal(`target fqdn required`);
	}

	if (typeof file == "number") {
		// CLI arguments parser converts to number automatically.
		// Reversing this conversion.
		file = file.toString();
	}

	if (!file) {
		logger.fatal(`path to file for saving credentials required`);
	}

	const store = new BeameStore();

	//noinspection JSDeprecatedSymbols
	let creds = store.getCredential(fqdn);

	if (!creds) {
		callback(`Credentials for ${fqdn} not found`, null);
		return;
	}

	let jsonCredentialObject = CommonUtils.stringify(creds, false);
	try {
		encrypt(jsonCredentialObject, targetFqdn, signingFqdn, (error, payload) => {
			if (payload) {
				let p = path.resolve(file);
				fs.writeFileSync(p, CommonUtils.stringify(payload, false));
				callback(null, p);
				return;
			}
			logger.fatal(`encryption failed: ${error}`);
		});
	} catch (e) {
		callback(e, null);
	}
}

/**
 * Check if two creds have common relative up to highestFqdn
 * @public
 * @method Creds.verifyAncestry
 * @param {String} fqdn - lowest fqdn to start from
 * @param {String} targetFqdn
 * @param {String} highestFqdn
 * @param {int} trustDepth
 * @param {Function} callback
 */
function verifyAncestry(fqdn, targetFqdn, highestFqdn, trustDepth, callback) {
	if(typeof trustDepth !== 'undefined' && trustDepth!= null){
		if(!Number.isInteger(trustDepth) || trustDepth<=0){
			console.error('trustDepth should be >= 1 (omit it to allow infinite depth)');
			process.exit(1);
		}
	}
	const store = new BeameStore();
	store.verifyAncestry(fqdn, targetFqdn, highestFqdn, trustDepth, (error, related) => {
		if(!error){
			console.log(fqdn,' & ',targetFqdn,' related => ', related?'YES':'NO');
		}
		else{
			console.error(error);
		}
		callback(error, related);
	});
}

/**
 * Fetch creds up to L0
 * @public
 * @method Creds.listCredChain
 * @param {String} fqdn - lowest fqdn in required chain
 * @param {Function} callback
 */
function listCredChain(fqdn, callback) {
	const store = new BeameStore();
	store.fetchCredChain(fqdn, null,(error, list) => {
		if(!error){
			callback(null, list);
		}
		else{
			callback(error, false);
		}
	});
}

listCredChain.toText = function (list) {
	let table = new Table({
		head:      ['level', 'fqdn'],
		colWidths: [16, 64]
	});

	const _setStyle = (value, cred) => {
		let val = value || '';
		return cred.expired === true ? colors.red(val) : val;
	};
	for(let i=0; i<list.length; i++){
		table.push([_setStyle(list[i].metadata.level, list[i]), _setStyle(list[i].fqdn, list[i])]);
	}
	return table;
};

/**
 * Import credentials exported with exportCredentials method
 * @public
 * @method Creds.importCredentials
 * @param {String} file - path to file with encrypted credentials
 * @param {Function} callback
 */
function importCredentials(file, callback) {

	if (!file) {
		logger.fatal(`path to file for saving credentials required`);
	}

	if (typeof file == "number") {
		// CLI arguments parser converts to number automatically.
		// Reversing this conversion.
		file = file.toString();
	}

	const store = new BeameStore();

	function _import(encryptedCredentials) {

		try {
			let decryptedCreds = decrypt(encryptedCredentials);

			if (decryptedCreds && decryptedCreds.length) {

				let parsedCreds = CommonUtils.parse(decryptedCreds);

				let importedCredential = new Credential(store);
				importedCredential.initFromObject(parsedCreds);
				importedCredential.saveCredentialsObject();
				callback(null, true);
			}
		}
		catch (error) {
			callback(error, null);
		}
	}

	try {

		let data = CommonUtils.parse(fs.readFileSync(path.resolve(file)) + "");


		if (data.signedBy && data.signature) {
			store.find(data.signedBy).then(signingCreds => {
					let encryptedCredentials;

					if (data.signature) {
						let sigStatus = signingCreds.checkSignature(data);
						console.log(`Signature status is ${sigStatus}`);
						if (!sigStatus) {
							callback(`Import credentials signature mismatch ${data.signedBy}, ${data.signature}`, null);
							return;
						}
						encryptedCredentials = data.signedData;
					} else {
						encryptedCredentials = data;
					}

					_import(encryptedCredentials);

				}
			).catch(error => {
				callback(error, null);
			});
		}
		else {
			_import(data.signature || data);
		}
	}
	catch (error) {
		callback(error, null);
	}


}

/**
 * XXX TODO: use URL not FQDN as parameter
 * Import non Beame credentials by fqdn and save to BeameStore
 * @public
 * @method Creds.importLiveCredentials
 * @param {String} fqdn
 */
function importLiveCredentials(fqdn) {
	Credential.importLiveCredentials(fqdn);
}
//endregion

//region Encrypt/Decrypt
/**
 * Encrypts given data for the given entity. Only owner of that entity's private key can open it. You must have the public key of the fqdn to perform the operation.
 * @public
 * @method Creds.encrypt
 * @param {String} data - data to encrypt
 * @param {String} targetFqdn - entity to encrypt for
 * @param {String|null} [signingFqdn]
 * @param {Function} callback
 */
function encrypt(data, targetFqdn, signingFqdn, callback) {

	if (typeof data != 'string') {
		throw new Error("encrypt(): data must be string");
	}

	function _encrypt() {
		return new Promise((resolve, reject) => {
				const store = new BeameStore();
				store.find(targetFqdn).then(targetCredential => {
					resolve(targetCredential.encrypt(targetFqdn, data, signingFqdn));
				}).catch(reject);
			}
		);
	}

	CommonUtils.promise2callback(_encrypt(), callback);
}

encrypt.toText = _obj2base64;

/**
 * Decrypts given data. You must have the private key of the entity that the data was encrypted for.
 * @public
 * @method Creds.decrypt
 * @param {EncryptedMessage} encryptedData - data to decrypt
 */
function decrypt(encryptedData) {

	const store = new BeameStore();

	try {
		logger.debug('message token parsed', encryptedData);
		if (!encryptedData.encryptedFor && (!encryptedData.signedData || !encryptedData.signedData.encryptedFor)) {
			logger.fatal("Decrypting a wrongly formatted message", encryptedData);
		}

		let targetFqdn = encryptedData.encryptedFor || encryptedData.signedData.encryptedFor;
		console.error(`targetFqdn ${targetFqdn}`);
		//noinspection JSDeprecatedSymbols
		let credential = store.getCredential(targetFqdn);

		return credential.decrypt(encryptedData);
	} catch (e) {
		logger.fatal("decrypt error ", e);
		return null;
	}
}
//endregion

//region Sign/Check Signature
/**
 * Signs given data. You must have private key of the fqdn.
 * @public
 * @method Creds.sign
 * @param {String} data - data to sign
 * @param {String} fqdn - sign as this entity
 * @returns {SignatureToken}
 */
function sign(data, fqdn) {
	const store = new BeameStore();
	//noinspection JSDeprecatedSymbols
	let cred    = store.getCredential(fqdn);
	if (cred) {
		return cred.sign(data);
	}
	logger.fatal("sign data with fqdn, element not found ");
}
sign.toText = _obj2base64;
/**
 * Checks signature.
 * @public
 * @method Creds.checkSignature
 * @param {SignatureToken} signedData => based64 encoded Signature Token
 * @param {Function} callback
 */
function checkSignature(signedData, callback) {


	function _checkSignature() {
		return new Promise((resolve, reject) => {
				const store = new BeameStore();
				store.find(signedData.signedBy).then(cred => {
					resolve(cred.checkSignature(signedData));
				}).catch(reject);
			}
		);
	}

	CommonUtils.promise2callback(_checkSignature(), callback);

}

checkSignature.toText = x => x ? 'GOOD SIGNATURE' : 'BAD SIGNATURE';

//endregion
