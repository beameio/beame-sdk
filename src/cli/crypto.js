"use strict";
/** @namespace Crypto **/

require('../../initWin');
const CryptoServices = require('../services/Crypto');

module.exports = {
	aesEncrypt: CryptoServices.aesEncrypt,
	aesDecrypt: CryptoServices.aesDecrypt
};
