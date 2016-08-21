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

var NodeRsa = require("node-rsa");
var config = require('../../config/Config');
const module_name = config.AppModules.BeameCrypto;
var BeameLogger = require('../utils/Logger');
var logger = new BeameLogger(module_name);
var BeameStore = require("../services/BeameStore");
var store = new BeameStore();

require('../../initWin');
var x509 = require("x509");


/**
 * Encrypts given data
 * @public
 * @method Crypto.aesEncrypt
 * @param {String} data - data to encrypt
 * @returns {Array.<AesEncryptedData>}
 */
function aesEncrypt(data) {
	var crypto = require('crypto');
	var sharedSecret = crypto.randomBytes(32); // should be 128 (or 256) bits
	var initializationVector = crypto.randomBytes(16); // IV is always 16-bytes
	var cipher = crypto.Cipheriv('aes-256-cbc', sharedSecret, initializationVector);
	var encrypted = cipher.update(data, 'utf8', 'base64');
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
	var crypto = require('crypto');
	if (!(data[1].IV && data[1].sharedCipher && data[0].AES256CBC )) {
		return "";
	}
	var cipher = new Buffer(data[1].sharedCipher, "base64");
	var IV = new Buffer(data[1].IV, "base64");
	
	var decipher = crypto.createDecipheriv("aes-256-cbc", cipher, IV);
	var dec = decipher.update(data[0].AES256CBC, 'base64', 'utf8');
	dec += decipher.final('utf8');
	return dec;
}

function getPublicKey(cert) {
	var xcert = x509.parseCert(cert + "");
	if (xcert) {
		var publicKey = xcert.publicKey;
		var modulus = new Buffer(publicKey.n, 'hex');
		var header = new Buffer("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA", "base64");
		var midheader = new Buffer("0203", "hex");
		var exponent = new Buffer("010001", "hex");
		var buffer = Buffer.concat([header, modulus, midheader, exponent]);
		var rsaKey = new NodeRsa(buffer, "public-der");
		rsaKey.importKey(buffer, "public-der");
		return rsaKey;
	}
	return {};
}

function getPublicKeyEncodedDer(cert) {
	var xcert = x509.parseCert(cert + "");
	if (xcert) {
		var publicKey = xcert.publicKey;
		var modulus = new Buffer(publicKey.n, 'hex');
		var header = new Buffer("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA", "base64");
		var midheader = new Buffer("0203", "hex");
		var exponent = new Buffer("010001", "hex");
		var buffer = Buffer.concat([header, modulus, midheader, exponent]);
		return buffer;
	}
	return {};
}
/**
 * Encrypts given data for the given entity. Only owner of that entity's private key can open it. You must have the public key of the fqdn to perform the operation.
 * @public
 * @method Crypto.encrypt
 * @param {String} data - data to encrypt
 * @param {String} fqdn - entity to encrypt for
 */
function encrypt(data, fqdn) {
	var element = store.search(fqdn)[0];
	if (element) {
		var rsaKey = getPublicKey(element.X509);
		if (rsaKey) {
			
			var sharedCiphered = aesEncrypt(data);
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			var symmetricCipherElement = JSON.stringify(sharedCiphered[1]);
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
		var encryptedMessage = JSON.parse(data);
		if (!encryptedMessage.encryptedFor) {
			logger.fatal("Decrypting a wrongly formatted message", data);
		}
		var element = store.search(encryptedMessage.encryptedFor)[0];
		if (!element && !(element.PRIVATE_KEY)) {
			logger.fatal(`private key for ${encryptedMessage.encryptedFor}`);
		}
		var rsaKey = new NodeRsa(element.PRIVATE_KEY, "private");
		
		var message = rsaKey.decrypt(encryptedMessage.rsaCipheredKeys) + " ";
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		var payload = JSON.parse(JSON.parse(message));
		
		var dechipheredPayload = aesDecrypt([
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
	var element = store.search(fqdn)[0];
	if (element) {
		var rsaKey = new NodeRsa(element.PRIVATE_KEY, "private");
		logger.info(`signing using ${fqdn}`);
		return rsaKey.sign(data, "base64", "utf8");
	}
	logger.error("sign data with fqdn, element not found ");
	return null;
}

/**
 * Signs given data. You must have private key of the fqdn.
 * @public
 * @method Crypto.checkPK
 * @param {String} PK - PK to test
 * @returns {string}
 */
function checkPK(PK) {
	var key = new NodeRsa(PK, 'pkcs8-public-pem');
	return(key.isPublic(true));
}

/**
 * Sign data with given private key
 * @param {String} data - data to sign
 * @param {string|buffer|object}  pk - private key
 * @returns {string|Buffer|null}
 */
function signWithKey(data, pk) {
	try {
		var rsaKey = new NodeRsa(pk, "private");
		return rsaKey.sign(data, "base64", "utf8");
	} catch (e) {
		logger.error("Sign with key failure", e);
		return null;
	}
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
	var element = store.search(fqdn)[0];
	var certBody;
	
	if (element) {
		certBody = element.X509 + "";
	}
	else {
		certBody = store.getRemoteCertificate(fqdn) + "";
	}
	
	var rsaKey = getPublicKey(certBody);
	var status = rsaKey.verify(data, signature, "utf8", "base64");
	logger.info(`signing status is ${status} ${fqdn}`);
	return status;
}

module.exports = {
	encrypt,
	decrypt,
	sign,
	signWithKey,
	checkPK,
	checkSignature,
	aesEncrypt,
	aesDecrypt
};
