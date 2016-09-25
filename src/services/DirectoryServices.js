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
	 * @param {String} dirPath
	 * @param {Function} callback
	 */
	deleteFolder(dirPath, callback) {
		rimraf(dirPath, callback);
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


	readMetadataSync(dir, fqdn) {
		let p         = beameUtils.makePath(dir, fqdn, config.metadataFileName);
		var metadata  = this.readJSON(p);
		metadata.path = beameUtils.makePath(dir, fqdn);
		return metadata;
	}

	writeMetadataSync(dir, fqdn, metadata) {
		let dirPath = beameUtils.makePath(dir, fqdn);
		this.saveFile(dirPath, config.metadataFileName, beameUtils.stringify(metadata));
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
