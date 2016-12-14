"use strict";
/** @namespace Token **/

const Table         = require('cli-table2');

const CommonUtils   = require('../utils/CommonUtils');
const BeameStore    = new (require('../services/BeameStoreV2'))();
const AuthToken     = require('../services/AuthToken');

function create(fqdn, data, ttl, callback) {
	//noinspection JSDeprecatedSymbols
	const cred = BeameStore.getCredential(fqdn);

	if(!cred) {
		callback(`token create - Credentials for ${fqdn} not found`, null);
		return;
	}

	CommonUtils.promise2callback(cred.signWithFqdn(fqdn, data, ttl), callback);
}

create.toText = token => new Buffer(CommonUtils.stringify(token,false)).toString('base64');


function validate(authToken, callback) {
	const tok = CommonUtils.parse(authToken);
	if(!tok){
		callback(`token validate - token for ${authToken} is invalid`, null);
		return;
	}
	CommonUtils.promise2callback(AuthToken.validate(tok),callback);
}

validate.toText = authToken => {

	function toStr(k, data) {
		if(k == 'created_at' || k == 'valid_till') {
			return `${data} - ${new Date(data*1000)}`;
		} else {
			return data;
		}
	}

	let ret = {};
	for(let k in authToken.signedData) {
		//noinspection JSUnfilteredForInLoop
		ret['signedData.' + k] = toStr(k, authToken.signedData[k]);
	}
	ret.signedBy = authToken.signedBy;
	ret.signature = authToken.signature.slice(0, 16) + '...';
	return objectToText(ret);
};


/**
 * @private
 * @param line
 * @returns {*}
 */
function lineToText(line) {
	let table = new Table();
	for (let k in line) {
		//noinspection JSUnfilteredForInLoop
		table.push({[k]: line[k].toString()});
	}

	return table;
}

//noinspection JSUnusedLocalSymbols
/**
 * @private
 * @param line
 * @returns {string}
 */
function objectToText(line) {
	let line2 = {};
	Object.keys(line).forEach(k => {
		if (CommonUtils.isObject(line[k])) {
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			line2[k] = JSON.stringify(line[k]);
		}
		else {
			line2[k] = line[k].toString();
		}
	});

	return lineToText(line2);
}

module.exports = {
	create,
	validate
};
