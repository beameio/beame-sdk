"use strict";
/** @namespace Crypto **/

const CryptoServices = require('../services/Crypto');

require('../../initWin');

/**
 *
 * @param data
 * @param {String} secret
 * @returns {Array.<AesEncryptedData>}
 */
function aesEncrypt(data, secret) {

	let sharedSecret = secret ? new Buffer(secret,'base64') : null;

	return CryptoServices.aesEncrypt(data,sharedSecret);

}

function aesDecrypt(data) {
	return CryptoServices.aesDecrypt(data);
}

module.exports = {
	aesEncrypt,
	aesDecrypt
};
