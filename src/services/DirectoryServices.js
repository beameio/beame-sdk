/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';

var path          = require('path');
var fs            = require('fs');
var async         = require('async');
var rimraf        = require('rimraf');
var _             = require('underscore');
var config        = require('../../config/Config');
const module_name = config.AppModules.DataServices;
var logger        = new (require('../utils/Logger'))(module_name);

var beameStore = new (require('../services/BeameStore'))();
var beameUtils = require('../utils/BeameUtils');
var mkdirp     = require('mkdirp');
/** @const {String} */



/**
 *
 * @constructor
 */
class DataServices {
	/**------------------- save payload methods -----------------------**/

	/**
	 * save provision payload to file
	 * @param {String} dirPath
	 * @param {Object} payload
	 * @param {Array} keys
	 * @param {Function} callback
	 */
	savePayload(dirPath, payload, keys, callback) {
		var self = this;
		var data = {};

		for (var i = 0; i < keys.length; i++) {
			if (payload.hasOwnProperty(keys[i])) {
				data[keys[i]] = payload[keys[i]];
			}
			else {
				var errMsg = logger.formatErrorMessage("payload key missing", module_name, {
					"payload": payload,
					"key":     keys[i]
				}, config.MessageCodes.InvalidPayload);
				callback(errMsg, null);
				return;
			}
		}

		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		self.saveFile(dirPath, config.metadataFileName, beameUtils.stringify(data), callback);
	}

	/**
	 *
	 * @param {String} dirPath
	 * @param {OrderPemResponse} payload
	 */
	saveCerts(dirPath, payload) {
		let self = this,
		    errMsg;


		var saveCert = function (responseField, targetName, callback) {
			if (!payload.hasOwnProperty(responseField)) {
				errMsg = logger.formatErrorMessage(`${responseField} missing in API response on ${dirPath}`, module_name, null, config.MessageCodes.ApiRestError);
				callback(errMsg, null);
			}

			//save cert
			self.saveFileAsync(path.join(dirPath, targetName), payload[responseField], function (error) {
				if (error) {
					errMsg = logger.formatErrorMessage(`Saving ${responseField} failed on path ${dirPath}`, module_name);
					callback(errMsg, null);
					return;
				}

				callback(null, 'done');
			});
		};

		return new Promise((resolve, reject) => {
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
							reject(error, null);
							return;
						}
						resolve(null, true);

					}
				);
			}
		);


	}

	/**------------------- folder/files methods -----------------------**/

	/**
	 * check if directory or file exists
	 * @param {String} dir
	 * @returns {boolean}
	 */
	doesPathExists(dir) {
		try {
			fs.accessSync(dir, fs.F_OK);
			return true;
		} catch (e) {
			return false;
		}
	}

	/**
	 *
	 * @param {String} dirPath
	 * @param {Array} nodeFiles
	 * @param {String} module
	 * @returns {boolean}
	 */
	isNodeFilesExists(dirPath, nodeFiles, module) {
		var self = this;
		for (var i = 0; i < nodeFiles.length; i++) {
			if (!self.doesPathExists(path.join(dirPath, nodeFiles[i]))) {
				logger.error(`cert missing on ${dirPath} for ${nodeFiles[i]}`, null, module);
				return false;
			}
		}

		return true;
	}

	/**
	 * create directory for supplied path
	 * @param {String} dirPath
	 */
	createDir(dirPath) {
		try {
			fs.accessSync(dirPath, fs.F_OK);
		}
		catch (e) {
			fs.mkdirSync(dirPath);
		}
	}

	mkdirp(dirPath) {

		return new Promise(
			(resolve, reject) => {
				try {
					mkdirp(dirPath, {}, function () {
						resolve();
					})
				}
				catch (e) {
					reject(`could not create directory ${e}`);
				}
			}
		);
	}

	/**
	 *
	 * @param {String} dirPath
	 * @param fileName
	 * @param {Object} data
	 * @param {Function|null} [cb]
	 */
	saveFile(dirPath, fileName, data, cb) {
		try {
			fs.writeFileSync(path.join(dirPath, fileName), data);
			cb && cb(null, true);
		}
		catch (error) {
			cb && cb(error, null);
		}

	}

	/**
	 *
	 * @param {String} dirPath
	 * @param fileName
	 * @param {Function|null} [cb]
	 */
	deleteFile(dirPath, fileName, cb) {
		try {
			fs.unlink(path.join(dirPath, fileName));
			cb && cb(null, true);
		}
		catch (error) {
			cb && cb(error, null);
		}

	}

	/**
	 * @param {String} dirPath
	 * @param {Function} callback
	 */
	deleteFolder(dirPath, callback) {
		rimraf(dirPath, callback);
	}

	/**
	 *
	 * @param {String} dirPath
	 * @param {String} oldName
	 * @param {String} newName
	 * @param {Function|null} [cb]
	 */
	renameFile(dirPath, oldName, newName, cb) {
		try {
			fs.rename(path.join(dirPath, oldName), path.join(dirPath, newName));
			cb && cb(null, true);
		}
		catch (error) {
			cb && cb(error, null);
		}

	}

	/**
	 *
	 * @param {String} dirPath
	 * @param {Object} data
	 * @param {Function|null} [cb]
	 */
	saveFileAsync(dirPath, data, cb) {
		fs.writeFile(dirPath, data, function (error) {
			if (!cb) return;
			if (error) {
				cb(error, null);
				return;
			}
			cb(null, true);
		});
	}

	/**
	 * try read metadata file for node
	 * @param {String} dir
	 * @param {String} fqdn
	 * @param {String} module
	 * @returns {Promise.<Object>}
	 */
	getNodeMetadataAsync(dir, fqdn, module) {
		var self = this;

		return new Promise(function (resolve, reject) {

			var developerMetadataPath = beameUtils.makePath(dir, config.metadataFileName);
			var metadata              = self.readJSON(developerMetadataPath);

			if (_.isEmpty(metadata)) {
				reject(logger.formatErrorMessage(`metadata.json for is empty for ${fqdn}`, module, null, config.MessageCodes.MetadataEmpty));
			}
			else {
				resolve(metadata);
			}

		});
	}

	readMetadataSync(dir, fqdn) {
		let p         = beameUtils.makePath(dir, fqdn, config.metadataFileName);
		var metadata  = this.readJSON(p);
		metadata.path = beameUtils.makePath(dir, fqdn);
		return metadata;
	}

	writeMetadataSync(dir, fqdn, metadata) {
		this.saveFile(dir, config.metadataFileName, beameUtils.stringify(data));
	}

	/**
	 *
	 * @param {String} path
	 * @param {String} module
	 * @param {String} fqdn
	 * @returns {Promise}
	 */
	isHostnamePathValidAsync(path, module, fqdn) {
		var self = this;

		return new Promise(function (resolve, reject) {

			if (!self.doesPathExists(path)) {//provided invalid fqdn
				reject(logger.formatErrorMessage(`Provided fqdn  ${fqdn } is invalid, list ./.beame to see existing fqdn s`, module));
			}
			else {
				resolve(true);
			}
		});
	}

	/**
	 *
	 * @param {String} fqdn
	 * @param {Array} nodeFiles
	 * @param {String} module
	 * @returns {boolean}
	 */
	validateHostCertsSync(fqdn, nodeFiles, module) {
		var self = this;

		var data = beameStore.searchItemAndParentFolderPath(fqdn);
		if (!_.isEmpty(data)) {
			var path = data['path'];

			if (!path) return false;

			return self.isNodeFilesExists(path, nodeFiles, module);
		}
		else {
			return false;
		}
	}

	/**
	 *
	 * @param {String} path
	 * @param {Array} nodeFiles
	 * @param {String} module
	 * @param {String} fqdn
	 * @param {String} nodeLevel => Developer | Atom | EdgeClient
	 * @returns {Promise}
	 */
	isNodeCertsExistsAsync(path, nodeFiles, module, fqdn, nodeLevel) {
		var self = this;

		return new Promise(function (resolve, reject) {

			if (!self.isNodeFilesExists(path, nodeFiles, module)) {
				reject(logger.formatErrorMessage(`${nodeLevel} files not found for ${fqdn }`, module));
			}
			else {
				resolve(true);
			}
		});
	}

	/**
	 *
	 * @param {String} filename
	 * @returns {Object}
	 */


	readObject(filename) {
		if (this.doesPathExists(filename)) {
			try {
				return fs.readFileSync(filename);
			}
			catch (error) {
				return {};
			}
		}

		return {};
	}

	/**
	 * read JSON file
	 * @param {String} dirPath
	 */
	readJSON(dirPath) {
		if (this.doesPathExists(dirPath)) {
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
	}

	copy(srcFile, destFile) {
		let BUF_LENGTH = 64 * 1024,
		    buff       = new Buffer(BUF_LENGTH),
		    fdr        = fs.openSync(srcFile, 'r'),
		    fdw        = fs.openSync(destFile, 'w'),
		    bytesRead  = 1,
		    pos        = 0;

		while (bytesRead > 0) {
			bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
			fs.writeSync(fdw, buff, 0, bytesRead);
			pos += bytesRead
		}
		fs.closeSync(fdr);
		fs.closeSync(fdw)
	}

	copyDir(src, dest) {
		mkdirp(dest);
		src       = src + path.sep;
		var files = fs.readdirSync(src);
		for (var i = 0; i < files.length; i++) {
			var current = fs.lstatSync(path.join(src, files[i]));
			if (current.isDirectory()) {
				//copyDir(path.join(src, files[i]), path.join(dest, files[i]));

			} else if (current.isSymbolicLink()) {
				var symlink = fs.readlinkSync(path.join(src, files[i]));
				fs.symlinkSync(symlink, path.join(dest, files[i]));
			} else {
				this.copy(path.join(src, files[i]), path.join(dest, files[i]));
			}
		}
	}

	scanDir(src) {
		return fs.readdirSync(src).filter(item => fs.lstatSync(path.join(src, item)).isDirectory());
	}
}


module.exports = DataServices;
