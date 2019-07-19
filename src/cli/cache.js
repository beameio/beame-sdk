"use strict";

const Table  = require('cli-table3');
const colors = require('colors');
require('../../initWin');

const Config             = require('../../config/Config');
const CommonUtils        = require('../utils/CommonUtils');
const BeameStore         = require("../services/BeameStoreV2");
const StoreCacheServices = require("../services/StoreCacheServices");

function _initScs() {
	//ensure store init
	BeameStore.getInstance();
	const scs = StoreCacheServices.getInstance();

	return new Promise((resolve) => {
			scs.load().then(() => {
				resolve(scs)
			})
		}
	);

}

function list(fqdn, callback) {


	_initScs().then(scs => {

		let opt = {};

		if (fqdn) opt.fqdn = fqdn;

		CommonUtils.promise2callback(scs.list(opt), callback);
	});

}

list.toText = (creds) => {
	/** @type {Object} **/
	let table = new Table({
		head:      ['fqdn', 'Expires', 'PK', 'ocsp', 'last'],
		colWidths: [65, 25, 10, 10, 25]
	});

	const _setStyle = (value, cred) => {
		let val = value || '';
		// noinspection JSUnresolvedFunction
		return cred.expired === true || cred.ocspStatus == Config.OcspStatus.Revoked ? colors.red(val) : val;
	};

	creds.forEach(item => {

		table.push([_setStyle(item.fqdn, item), _setStyle(item.notAfter.toLocaleString(), item), _setStyle(item.hasPrivateKey ? 'Y' : 'N', item), _setStyle(item.ocspStatus, item), _setStyle(CommonUtils.formatDate(item.lastLoginDate), item)]);
	});
	return table;
};

function renewAll(force, callback) {
	_initScs().then(scs => {
		CommonUtils.promise2callback(scs.renewCredentials(!!(force && force === "true")), callback);
	});
}
renewAll.toText = x => x;

module.exports = {
	list,
	renewAll
};
