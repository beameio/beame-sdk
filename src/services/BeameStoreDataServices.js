/**
 * Created by zenit1 on 29/08/2016.
 */
"use strict";

var fs       = require('fs');
var path     = require('path');
var async    = require('async');
var exec     = require('child_process').exec;
var execFile = require('child_process').execFile;

var config        = require('../../config/Config');
const module_name = config.AppModules.BeameStoreDataHelper;
var logger        = new (require('../utils/Logger'))(module_name);


function makepath(fqdn) {
	var dirPath = path.join(config.localCertsDir, fqdn);
	try {

		fs.accessSync(dirPath, fs.F_OK);
	}
	catch (e) {
		fs.mkdirSync(dirPath);
	}
}

class BeameStoreDataServices {

	constructor(fqdn) {
		// init store
		this.fqdn = fqdn;
		this.dir  = makepath(fqdn);
	}

	readObject(key) {

	};

	writeObject(data, key) {

	};

}

module.exports = BeameStoreDataServices;

