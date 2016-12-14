"use strict";
/** @namespace Crypto **/

const CryptoServices = require('../services/Crypto');
const CommonUtils    = require('../utils/CommonUtils');

require('../../initWin');

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
 * @public
 * @method Crypto.aesEncrypt
 * @param {String} data
 * @param {String|null} [secret]
 * @returns Array.<AesEncryptedData>
 */
function aesEncrypt(data, secret) {
	let sharedSecret = secret ? new Buffer(secret, 'base64') : null;
	return CryptoServices.aesEncrypt(data, sharedSecret);
}

aesEncrypt.toText = _obj2base64;

/**
 * @public
 * @method Crypto.aesDecrypt
 * @param {Array} encryptedData
 * @returns {String}
 */
function aesDecrypt(encryptedData) {
	return CryptoServices.aesDecrypt(encryptedData);
}

aesDecrypt.toText = x => x;

module.exports = {
	aesEncrypt,
	aesDecrypt
};
