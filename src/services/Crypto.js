/**
 * Created by zenit1 on 06/10/2016.
 */
"use strict";

/**
 * @typedef {Object} EncryptedMessage
 * @property {string|Buffer} rsaCipheredKeys
 * @property {AesEncryptedData} data
 * @property {String} encryptedFor
 */

/**
 * @typedef {Object} AesEncryptedData
 * @property {String} AES128CBC - base64 encoded encrypted data
 * @property {String} IV - base64 encoded initialization vector
 * @property {String} sharedCipher - base64 encoded shared secret
 */



class CryptoServices{

	/**
	 * Encrypts given data
	 * @public
	 * @method Crypto.aesEncrypt
	 * @param {String} data - data to encrypt
	 * @param {Buffer|null} [sharedSecret] - shared secret
	 * @returns {Array.<AesEncryptedData>}
	 */
	static aesEncrypt(data, sharedSecret) {
		let crypto = require('crypto');
		if(!sharedSecret) {
			sharedSecret = crypto.randomBytes(16); // should be 128 (or 256) bits
		}
		let initializationVector = crypto.randomBytes(16); // IV is always 16-bytes
		let cipher = crypto.Cipheriv('AES-128-CBC', sharedSecret, initializationVector);
		let encrypted = cipher.update(data, 'utf8', 'base64');
		encrypted += cipher.final('base64');

		return [{AES128CBC: encrypted}, {
			IV: initializationVector.toString('base64'),
			sharedCipher: sharedSecret.toString('base64')
		}];
	}

	/**
	 * Decrypts given data
	 * @public
	 * @method Crypto.aesDecrypt
	 * @param {Array} data - data to encrypt
	 * @returns {String} data - decrypted plaintext
	 */
	static aesDecrypt(data) {
		//data = JSON.parse(data);
		let crypto = require('crypto');
		if (!(data[1].IV && data[1].sharedCipher && data[0].AES128CBC )) {
			throw new Error('Invalid data passed to aesDecrypt');
		}
		let cipher = new Buffer(data[1].sharedCipher, "base64");
		let IV = new Buffer(data[1].IV, "base64");

		let decipher = crypto.createDecipheriv("aes-128-cbc", cipher, IV);
		let dec = decipher.update(data[0].AES128CBC, 'base64', 'utf8');
		dec += decipher.final('utf8');
		return dec;
	}
}

module.exports = CryptoServices;