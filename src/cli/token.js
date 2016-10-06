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
		return new Promise((resolve, reject) => {
			resolve(new Buffer(token).toString('base64'));
		});
	}

	CommonUtils.promise2callback(cred.signWithFqdn(fqdn, data).then(base64), callback);
}

create.toText = x=>x;

function validate(authToken) {
	const tok = JSON.parse(new Buffer(authToken, 'base64').toString());
	return AuthToken.validate(tok);
}

module.exports = {
	create,
	validate
};
