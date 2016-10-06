"use strict";
/** @namespace Token **/

const module_name   = 'Token';
const BeameLogger   = require('../utils/Logger');
const logger        = new BeameLogger(module_name);
const CommonUtils   = require('../utils/CommonUtils');
const BeameStore    = new (require('../services/BeameStoreV2'))();
const AuthToken     = require('../services/AuthToken');

function create(fqdn, data, callback) {
	const cred = BeameStore.getCredential(fqdn);

	if(!cred) {
		callback(`token create - Credentials for ${fqdn} not found`, null);
		return;
	}

	function base64(token) {
		return new Promise((resolve) => {
			resolve(new Buffer(CommonUtils.stringify(token,false)).toString('base64'));
		});
	}

	CommonUtils.promise2callback(cred.signWithFqdn(fqdn, data).then(base64), callback);
}

create.toText = x=>x;

function validate(authToken) {
	const tok = CommonUtils.parse(new Buffer(authToken, 'base64').toString());
	return AuthToken.validate(tok);
}

validate.toText = authToken => {

	function toStr(k, data) {
		if(k == 'created_at' || k == 'valid_till') {
			return `${data} - ${new Date(data*1000)}`;
		} else {
			return data;
		}
	}

	var ret = {};
	for(let k in authToken.signedData) {
		ret['signedData.' + k] = toStr(k, authToken.signedData[k]);
	}
	ret.signedBy = authToken.signedBy;
	ret.signature = authToken.signature.slice(0, 16) + '...';
	return require('./creds.js').objectToText(ret);
};

module.exports = {
	create,
	validate
};
