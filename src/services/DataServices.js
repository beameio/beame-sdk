/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';

var path   = require('path');
var debug  = require("debug")("./src/services/DataServices.js");
var fs     = require('fs');
var exec   = require('child_process').exec;
var async  = require('async');
var rimraf = require('rimraf');
var _      = require('underscore');
var config = require('../../config/Config');

var beameStore = new (require('../services/BeameStore'))();
var beameUtils = require('../utils/BeameUtils');

/** @const {String} */
var csrSubj = "C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=";


/**------------------------ private methods ---------------------**/
function randomPassword(length) {
	var len   = length || 16;
	var chars = "abcdefghijklmnopqrstuvwxyz!@#$%^&*()-+<>ABCDEFGHIJKLMNOP1234567890";
	var pass  = "";
	for (var x = 0; x < len; x++) {
		var i = Math.floor(Math.random() * chars.length);
		pass += chars.charAt(i);
	}

	return pass;
}

/**
 *
 * @constructor
 */
var DataServices = function () {

};

/**------------------- create csr -----------------------**/
/**
 *
 * @param {String} dirPath
 * @param {String} hostname
 * @param {String|null|undefined} [pkName]
 * @returns {Promise}
 */
DataServices.prototype.createCSR = function (dirPath, hostname, pkName) {
	var self = this;
	var errMsg;

	return new Promise(function (resolve, reject) {

		/* --------- generate RSA key: ------------------------------------------------*/
		var cmd = "openssl genrsa 2048";

		debug(beameUtils.formatDebugMessage(config.AppModules.DataServices, config.MessageCodes.DebugInfo, "generating private key with", {"cmd": cmd}));

		exec(cmd, function (error, stdout, stderr) {
			var devPK = stdout;

			if (error !== null) {
				/* -------  put error handler to deal with possible openssl failure -----------*/
				errMsg = beameUtils.formatDebugMessage(config.AppModules.DataServices, config.MessageCodes.OpenSSLError, "Failed to generate Private Key", {
					"error":  error,
					"stderr": stderr
				});

				reject(errMsg);
				return;
			}

			var pkFileName = pkName || config.CertFileNames.PRIVATE_KEY;

			var pkFile = path.join(dirPath, pkFileName);

			self.saveFile(dirPath, pkFileName, devPK, function (error) {
				if (!error) {
					cmd = "openssl req -key " + pkFile + " -new -subj \"/" + (csrSubj + hostname) + "\"";
					debug(beameUtils.formatDebugMessage(config.AppModules.DataServices, config.MessageCodes.DebugInfo, "generating CSR with", {"cmd": cmd}));

					try {
						exec(cmd,
							/**
							 *
							 * @param error
							 * @param stdout => return CSR
							 * @param stderr
							 */
							function (error, stdout, stderr) {
								if (error !== null) {
									errMsg = beameUtils.formatDebugMessage(config.AppModules.ProvisionApi, config.MessageCodes.OpenSSLError, "Failed to generate CSR", {
										"error":  error,
										"stderr": stderr
									});
									console.error(errMsg);
									reject(errMsg);
								}
								else {
									resolve(stdout);
								}

							});
					}
					catch (error) {
						errMsg = beameUtils.formatDebugMessage(config.AppModules.ProvisionApi, config.MessageCodes.OpenSSLError, "Create Developer CSR", {"error": error});
						console.error(errMsg);
						reject(errMsg);
					}
				}
				else {
					errMsg = beameUtils.formatDebugMessage(config.AppModules.DataServices, config.MessageCodes.OpenSSLError, "Failed to save Private Key", {
						"error":  error,
						"stderr": stderr
					});
					console.error(errMsg);
					reject(errMsg);
				}
			});

		});

	});
};

/**------------------- save payload methods -----------------------**/

/**
 * save provision payload to file
 * @param {String} dirPath
 * @param {Object} payload
 * @param {Array} keys
 * @param {String} level => Developer | Atom | EdgeClient
 * @param {Function} callback
 */
DataServices.prototype.savePayload = function (dirPath, payload, keys, level, callback) {
	var self = this;
	var data = {
		"level": level.toLowerCase()
	};

	for (var i = 0; i < keys.length; i++) {
		if (payload[keys[i]]) {
			data[keys[i]] = payload[keys[i]];
		}
		else {
			var errMsg = beameUtils.formatDebugMessage(level, config.MessageCodes.InvalidPayload, "payload key missing", {
				"payload": payload,
				"key":     keys[i]
			});
			console.error(errMsg);
			callback(errMsg, null);
			return;
		}
	}

	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	self.saveFile(dirPath, config.metadataFileName, JSON.stringify(data, null, 2), callback);
};

/**
 *
 * @param {String} dirPath
 * @param {OrderPemResponse} payload
 * @param finalCallback
 */
DataServices.prototype.saveCerts = function (dirPath, payload, finalCallback) {
	var self = this;
	var errMsg;

	var saveCert = function (responseField, targetName, callback) {
		if (!payload[responseField]) {
			errMsg = beameUtils.formatDebugMessage(config.AppModules.DataServices, config.MessageCodes.ApiRestError, responseField + " missing in API response", {"path": dirPath});
			callback(errMsg, null);
		}

		//save cert
		self.saveFileAsync(path.join(dirPath, targetName), payload[responseField], function (error) {
			if (error) {
				errMsg = beameUtils.formatDebugMessage(config.AppModules.DataServices, config.MessageCodes.ApiRestError, "Saving " + responseField + " failed", {"path": dirPath});
				console.error(errMsg);
				callback(errMsg, null);
				return;
			}

			callback(null, 'done');
		});
	};

	async.parallel(
		[
			function (callback) {
				saveCert(config.CertResponseFields.x509, config.CertFileNames.X509, callback);
			},
			function (callback) {
				saveCert(config.CertResponseFields.ca, config.CertFileNames.CA, callback);
			},
			function (callback) {
				saveCert(config.CertResponseFields.pkcs7, config.CertFileNames.PKCS7, callback);
			}

		],
		function (error) {
			if (error) {
				finalCallback(error, null);
				return;
			}


			async.parallel(
				[
					function (callback) {
						exec('openssl pkcs7 -print_certs -in ' + dirPath + config.CertFileNames.PKCS7, function (error, stdout) {
							if (error) {
								callback(error, null);
								return;
							}
							self.saveFileAsync(path.join(dirPath, config.CertFileNames.P7B), stdout, function (error) {
								error ? callback(error, null) : callback(null, true);
							});
						});
					},
					function (callback) {
						var pwd = randomPassword();

						var cmd = "openssl pkcs12 -export -in " + path.join(dirPath, config.CertFileNames.X509) + " -certfile " + path.join(dirPath, config.CertFileNames.CA) + " -inkey " + path.join(dirPath, config.CertFileNames.PRIVATE_KEY) + " -password pass:'" + pwd + "' -out " + path.join(dirPath + config.CertFileNames.PKCS12);

						try {
							exec(cmd, function (error) {
								if (error) {
									callback(error, null);
									return;
								}
								self.saveFileAsync(path.join(dirPath, config.CertFileNames.PWD), pwd, function (error) {
									error ? callback(error, null) : callback(null, true);
								});
							});

						}
						catch (e) {
							callback(e, null);
						}

					}
				],
				function (error) {
					if (error) {
						finalCallback(error, null);
						return;
					}

					finalCallback && finalCallback(null, true);
				}
			);
		}
	);

};

/**------------------- folder/files methods -----------------------**/

/**
 * check if directory or file exists
 * @param {String} dir
 * @returns {boolean}
 */
DataServices.prototype.isPathExists = function (dir) {
	try {
		fs.accessSync(dir, fs.F_OK);
		return true;
	} catch (e) {
		return false;
	}
};

/**
 *
 * @param {String} dirPath
 * @param {Array} nodeFiles
 * @param {String} module
 * @returns {boolean}
 */
DataServices.prototype.isNodeFilesExists = function (dirPath, nodeFiles, module) {
	var self = this;
	for (var i = 0; i < nodeFiles.length; i++) {
		if (!self.isPathExists(path.join(dirPath, nodeFiles[i]))) {
			console.error(beameUtils.formatDebugMessage(module, config.MessageCodes.NodeFilesMissing, "cert missing", {
				"path": dirPath,
				"file": nodeFiles[i]
			}));
			return false;
		}
	}

	return true;
};

/**
 * create directory for supplied path
 * @param {String} dirPath
 */
DataServices.prototype.createDir = function (dirPath) {
	try {
		fs.accessSync(dirPath, fs.F_OK);
	}
	catch (e) {
		fs.mkdirSync(dirPath);
	}
};

/**
 *
 * @param {String} dirPath
 * @param fileName
 * @param {Object} data
 * @param {Function|null} [cb]
 */
DataServices.prototype.saveFile = function (dirPath, fileName, data, cb) {
	try {
		fs.writeFileSync(path.join(dirPath, fileName), data);
		cb && cb(null, true);
	}
	catch (error) {
		cb && cb(error, null);
	}

};

/**
 *
 * @param {String} dirPath
 * @param fileName
 * @param {Function|null} [cb]
 */
DataServices.prototype.deleteFile = function (dirPath, fileName, cb) {
	try {
		fs.unlink(path.join(dirPath, fileName));
		cb && cb(null, true);
	}
	catch (error) {
		cb && cb(error, null);
	}

};

/**
 * @param {String} dirPath
 * @param {Function} callback
 */
DataServices.prototype.deleteFolder = function (dirPath, callback) {
	rimraf(dirPath, callback);
};

/**
 *
 * @param {String} dirPath
 * @param {String} oldName
 * @param {String} newName
 * @param {Function|null} [cb]
 */
DataServices.prototype.renameFile = function (dirPath, oldName, newName, cb) {
	try {
		fs.rename(path.join(dirPath, oldName), path.join(dirPath, newName));
		cb && cb(null, true);
	}
	catch (error) {
		cb && cb(error, null);
	}

};

/**
 *
 * @param {String} dirPath
 * @param {Object} data
 * @param {Function|null} [cb]
 */
DataServices.prototype.saveFileAsync = function (dirPath, data, cb) {
	fs.writeFile(dirPath, data, function (error) {
		if (!cb) return;
		if (error) {
			cb(error, null);
			return;
		}
		cb(null, true);
	});
};

/**
 * try read metadata file for node
 * @param {String} devDir
 * @param {String} hostname
 * @param {String} module
 * @returns {Promise.<Object>}
 */
DataServices.prototype.getNodeMetadataAsync = function (devDir, hostname, module) {
	var self = this;

	return new Promise(function (resolve, reject) {

		var developerMetadataPath = beameUtils.makePath(devDir, config.metadataFileName);
		var metadata              = self.readJSON(developerMetadataPath);

		if (_.isEmpty(metadata)) {
			var errorJson = beameUtils.formatDebugMessage(module, config.MessageCodes.MetadataEmpty, "metadata.json for is empty", {"hostname": hostname});
			console.error(errorJson);
			reject(errorJson);
		}
		else {
			resolve(metadata);
		}

	});
};

/**
 *
 * @param {String} path
 * @param {String} module
 * @param {String} hostname
 * @returns {Promise}
 */
DataServices.prototype.isHostnamePathValidAsync = function (path, module, hostname) {
	var self = this;

	return new Promise(function (resolve, reject) {

		if (!self.isPathExists(path)) {//provided invalid hostname
			var errMsg = self.formatDebugMessage(module, config.MessageCodes.NodeFolderNotExists, "Provided hostname is invalid, list ./.beame to see existing hostnames", {"hostname": hostname});
			console.error(errMsg);
			reject(errMsg);
		}
		else {
			resolve(true);
		}
	});
};

/**
 *
 * @param {String} hostname
 * @param {Array} nodeFiles
 * @param {String} module
 * @returns {boolean}
 */
DataServices.prototype.validateHostCertsSync = function (hostname, nodeFiles, module) {
	var self = this;

	var data = beameStore.searchItemAndParentFolderPath(hostname);
	if (!_.isEmpty(data)) {
		var path = data['path'];

		if (!path) return false;

		return self.isNodeFilesExists(path, nodeFiles, module);
	}
	else {
		return false;
	}
};

/**
 *
 * @param {String} path
 * @param {Array} nodeFiles
 * @param {String} module
 * @param {String} hostname
 * @param {String} nodeLevel => Developer | Atom | EdgeClient
 * @returns {Promise}
 */
DataServices.prototype.isNodeCertsExistsAsync = function (path, nodeFiles, module, hostname, nodeLevel) {
	var self = this;

	return new Promise(function (resolve, reject) {

		if (!self.isNodeFilesExists(path, nodeFiles, module)) {
			var errMsg = beameUtils.formatDebugMessage(module, config.MessageCodes.NodeFilesMissing, nodeLevel + " files not found", {
				"level":    nodeLevel,
				"hostname": hostname
			});
			console.error(errMsg);
			reject(errMsg);
		}
		else {
			resolve(true);
		}
	});
};

/**
 *
 * @param {String} hostname
 * @returns {Object}
 */
DataServices.prototype.getHostMetadataSync = function (hostname) {
	var self = this;
	var data = beameStore.searchItemAndParentFolderPath(hostname);
	if (!_.isEmpty(data)) {
		var path = data['path'];

		if (!path) return false;

		var metadataPath = beameUtils.makePath(path, config.metadataFileName);
		var metadata     = self.readJSON(metadataPath);

		return _.isEmpty(metadata) ? null : metadata;

	}
	else {
		return null;
	}

};

/**
 * read JSON file
 * @param {String} dirPath
 */
DataServices.prototype.readJSON = function (dirPath) {
	if (this.isPathExists(dirPath)) {
		try {
			var file = fs.readFileSync(dirPath);
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			return JSON.parse(file);
		}
		catch (error) {
			return {};
		}
	}

	return {};
};

module.exports = DataServices;