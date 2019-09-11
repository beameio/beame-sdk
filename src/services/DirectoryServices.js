/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';

const path        = require('path');
const fs          = require('fs');
const async       = require('async');
const rimraf      = require('rimraf');
const config      = require('../../config/Config');
const module_name = config.AppModules.DataServices;
const logger      = new (require('../utils/Logger'))(module_name);
const CommonUtils = require('../utils/CommonUtils');
/** @const {String} */


function nop(){}

/**
 *
 * @constructor
 */
class DataServices {

	/**
	 * check if directory or file exists
	 * @param {String} dir
	 * @returns {boolean}
	 */
	static doesPathExists(dir) {
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
	static createDir(dirPath) {
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
	static saveFile(dirPath, fileName, data, cb) {
		this.createDir(dirPath); // ensure folder exists
		try {
			fs.writeFileSync(path.join(dirPath, fileName), data);
			cb && cb(null, true);
		}
		catch (error) {
			cb && cb(error, null);
		}

	}

	static readFile (path) {
		return fs.readFileSync(path, 'utf8');
	};

	/**
	 * @param {String} dirPath
	 * @param {Function} callback
	 */
	static deleteFolder(dirPath, callback) {
		rimraf(dirPath, callback);
	}

	static deleteFile(_path){
		try {
			fs.unlink(_path);
		} catch (e) {
		}
	}

	static readMetadataSync(dir, fqdn) {
		return DataServices.readJSON(path.join(dir, fqdn, config.metadataFileName));
	}

	static writeMetadataSync(dir, fqdn, metadata) {
		let dirPath = path.join(dir, fqdn);
		DataServices.saveFile(dirPath, config.metadataFileName, CommonUtils.stringify(metadata, true));
	}

	/**
	 *
	 * @param {String} filename
	 * @returns {Object}
	 */
	static readObject(filename) {
		return fs.readFileSync(filename);
	}

	/**
	 * read JSON file
	 * @param {String} fileName
	 */
	static readJSON(fileName) {
		if(!DataServices.doesPathExists(fileName)) {
			return {};
		}

		try {
			return JSON.parse(fs.readFileSync(fileName));
		} catch(error) {
			return {};
		}

	}

	/**
	 *
	 * @param {String} dirPath
	 * @param {OrderPemResponse} certificates
	 */
	saveCerts(dirPath, certificates) {
		let errMsg;


		const saveCert = (responseField, targetName, callback) => {
			if (!certificates.hasOwnProperty(responseField)) {
				errMsg = logger.formatErrorMessage(`${responseField} missing in API response on ${dirPath}`, module_name, null, config.MessageCodes.ApiRestError);
				callback(errMsg, null);
			}

			//save cert
			this.saveFileAsync(path.join(dirPath, targetName), certificates[responseField], (error) => {
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

							if (!certificates.hasOwnProperty(config.CertResponseFields.p7b) || !certificates[config.CertResponseFields.p7b].length) {
								callback(null);
							}
							else{
								saveCert(config.CertResponseFields.p7b, config.CertFileNames.P7B, callback);
							}
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

	/**
	 *
	 * @param {String} dirPath
	 * @param {Object} data
	 * @param {Function|null} [cb]
	 */
	saveFileAsync(dirPath, data, cb) {

		return new Promise((resolve, reject) => {
				fs.writeFile(dirPath, data, error => {
					if (error) {
						cb && cb(error, null);
						reject(error);
						return;
					}
					cb && cb(null, true);
					resolve();
				});
			}
		);
	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 *
	 * @param {String} dirPath
	 * @param {Object} data
	 * @param {Function|null} [cb]
	 */
	static saveFileSync(dirPath, data, cb = nop) {

		try {
			fs.writeFileSync(dirPath, data);
			cb(null, true);
		}
		catch (error) {
			cb(error, null);
		}
	}

	scanDir(src) {
		if(fs.existsSync(src)){
			return fs.readdirSync(src).filter(item => fs.lstatSync(path.join(src, item)).isDirectory());
		}

		return {};
	}

	static readDirFiles(src) {
		if(fs.existsSync(src))
			return fs.readdirSync(src).filter(item => fs.lstatSync(path.join(src, item)).isFile());
		return null;
	}
}


module.exports = DataServices;
