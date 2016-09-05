"use strict";
/** @namespace Crypto **/

/**
 * @typedef {Object} AesEncryptedData
 * @property {String} AES256CBC - base64 encoded encrypted data
 * @property {String} IV - base64 encoded initialization vector
 * @property {String} sharedCipher - base64 encoded shared secret
 */

/*### sign the data in testFIle with a key
 openssl rsautl -sign -in ./test -inkey ../../.beame/oxxmrzj0qlvsrt1h.v1.beameio.net/private_key.pem -out sig
 
 #decrypt and verify
 
 openssl rsautl -verify -inkey mykey.pub -in sig -pubin
 
 #extract public key from certificate
 openssl x509 -pubkey -noout -in ../../.beame/oxxmrzj0qlvsrt1h.v1.beameio.net/x509.pem > pubkey.pem*/

const config = require('../../config/Config');
const module_name = config.AppModules.BeameCrypto;
const BeameLogger = require('../utils/Logger');
const logger = new BeameLogger(module_name);
const BeameStore = require("../services/BeameStoreV2");
const store = new BeameStore();

require('../../initWin');


/**
 * Encrypts given data
 * @public
 * @method Crypto.aesEncrypt
 * @param {String} data - data to encrypt
 * @returns {Array.<AesEncryptedData>}
 */
function aesEncrypt(data) {
	let crypto = require('crypto');
	let sharedSecret = crypto.randomBytes(32); // should be 128 (or 256) bits
	let initializationVector = crypto.randomBytes(16); // IV is always 16-bytes
	let cipher = crypto.Cipheriv('aes-256-cbc', sharedSecret, initializationVector);
	let encrypted = cipher.update(data, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	
	return [{AES256CBC: encrypted}, {
		IV: initializationVector.toString('base64'),
		sharedCipher: sharedSecret.toString('base64')
	}];
	
}

/**
 * Decrypts given data
 * @public
 * @method Crypto.aesDecrypt
 * @param {AesEncryptedData} data - data to encrypt
 * @returns {String} data - decrypted plaintext
 */
function aesDecrypt(data) {
	//data = JSON.parse(data);
	let crypto = require('crypto');
	if (!(data[1].IV && data[1].sharedCipher && data[0].AES256CBC )) {
		return "";
	}
	let cipher = new Buffer(data[1].sharedCipher, "base64");
	let IV = new Buffer(data[1].IV, "base64");
	
	let decipher = crypto.createDecipheriv("aes-256-cbc", cipher, IV);
	let dec = decipher.update(data[0].AES256CBC, 'base64', 'utf8');
	dec += decipher.final('utf8');
	return dec;
}

/**
 * Encrypts given data for the given entity. Only owner of that entity's private key can open it. You must have the public key of the fqdn to perform the operation.
 * @public
 * @method Crypto.encrypt
 * @param {String} data - data to encrypt
 * @param {String} fqdn - entity to encrypt for
 */
function encrypt(data, fqdn) {
	let credential = store.search(fqdn)[0];
	while(!credential.publicKeyStr) {
		process.nextTick(() => {
			if (credential && credential.publicKeyStr) {
				let rsaKey = credential.getPublicKeyNodeRsa();
				if (rsaKey) {
					let sharedCiphered = aesEncrypt(data);
					//noinspection ES6ModulesDependencies,NodeModulesDependencies
					let symmetricCipherElement = JSON.stringify(sharedCiphered[1]);
					sharedCiphered[1] = "";

					//noinspection ES6ModulesDependencies,NodeModulesDependencies
					return {
						rsaCipheredKeys: rsaKey.encrypt(JSON.stringify(symmetricCipherElement), "base64", "utf8"),
						data: sharedCiphered[0],
						encryptedFor: fqdn
					};
				}

				logger.error("encrypt failure, public key not found");
				return null;
			}
		});
	}


	
	logger.error("encrypt failure, element not found");
	return null;
}

/**
 * Decrypts given data. You must have the private key of the entity that the data was encrypted for.
 * @public
 * @method Crypto.decrypt
 * @param {String} data - data to encrypt
 */
function decrypt(data) {
	try {
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let encryptedMessage = JSON.parse(data);
		if (!encryptedMessage.encryptedFor) {
			logger.fatal("Decrypting a wrongly formatted message", data);
		}
		let credential = store.search(encryptedMessage.encryptedFor)[0];
		if (!credential  && !credential.hasPrivateKey()) {
			logger.fatal(`private key for ${encryptedMessage.encryptedFor}`);
		}
		let rsaKey = credential.getPrivateKeyNodeRsa();
		
		let message = rsaKey.decrypt(encryptedMessage.rsaCipheredKeys) + " ";
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let payload = JSON.parse(JSON.parse(message));
		
		let dechipheredPayload = aesDecrypt([
			encryptedMessage.data,
			payload,
		]);
		if (!message) {
			logger.fatal("Decrypting, No message");
		}
	} catch (e) {
		logger.fatal("decrypt error ", e);
	}
	return dechipheredPayload || null;
}

/**
 * Signs given data. You must have private key of the fqdn.
 * @public
 * @method Crypto.sign
 * @param {String} data - data to sign
 * @param {String} fqdn - sign as this entity
 * @returns {string|Buffer|null}
 */
function sign(data, fqdn) {
	let element = store.search(fqdn)[0];
	if (element) {
		let rsaKey = element.getPrivateKeyNodeRsa();
		logger.info(`signing using ${fqdn}`);
		return rsaKey.sign(data, "base64", "utf8");
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
 * @param {String} signature
 */
function checkSignature(data, fqdn, signature) {
	let element = store.search(fqdn)[0];
	let certBody;
	
	if (element) {
		certBody = element.X509 + "";
	}
	else {
		certBody = store.getRemoteCertificate(fqdn) + "";
	}
	
	let rsaKey = getPublicKey(certBody);
	let status = rsaKey.verify(data, signature, "utf8", "base64");
	logger.info(`signing status is ${status} ${fqdn}`);
	return status;
}


module.exports = {
	encrypt,
	decrypt,
	sign,
	checkSignature,
	aesEncrypt,
	aesDecrypt
};
