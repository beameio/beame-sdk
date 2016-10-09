"use strict";
/** @namespace Crypto **/

const CryptoServices = require('../services/Crypto');
const CommonUtils    = require('../utils/CommonUtils');

require('../../initWin');

/**
 *
 * @param data
 * @param {String} secret
 * @returns string
 */
function aesEncrypt(data, secret) {

	let sharedSecret = secret ? new Buffer(secret, 'base64') : null;

	let array = CryptoServices.aesEncrypt(data, sharedSecret);

	let token ={};

	array.forEach((el,ind)=> {

		token[ind] = el;
	});

	return new Buffer(CommonUtils.stringify(token, false)).toString('base64');

}

function aesDecrypt(data) {

	var token   = CommonUtils.parse(new Buffer(data, 'base64').toString());

	let array =[];

	for(let key in token){
		if(token.hasOwnProperty(key)){
			array.push(token[key]);
		}
	}

	return CryptoServices.aesDecrypt(array);
}

module.exports = {
	aesEncrypt,
	aesDecrypt
};
