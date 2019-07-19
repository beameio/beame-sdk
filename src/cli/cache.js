"use strict";

require('../../initWin');

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

function renewAll(force, callback) {
	_initScs().then(scs => {
		CommonUtils.promise2callback(scs.renewCredentials(!!(force && force === "true")), callback);
	});
}
renewAll.toText = x => x;

module.exports = {
	renewAll
};
