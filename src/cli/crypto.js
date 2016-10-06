"use strict";
/** @namespace Crypto **/

const CryptoServices = require('../services/Crypto');

require('../../initWin');


function aesEncrypt(data, sharedSecret) {
	return CryptoServices.aesEncrypt(data,sharedSecret);

}

function aesDecrypt(data) {
	return CryptoServices.aesDecrypt(data);
}

module.exports = {
	aesEncrypt,
	aesDecrypt
};
