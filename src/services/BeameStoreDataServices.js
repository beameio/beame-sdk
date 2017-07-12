/** jshint esversion: 6 **/
'use strict';

/**
 * @typedef {Object} FqdnMetadata
 * @property {String|null} [name]
 * @property {String|null} [email]
 * @property {String|null} [parent_fqdn]
 */

/**
 * @typedef {Object} BeameAuthorizationToken
 * @property {String} authenticationUrl
 * @property {String} signingFqdn
 * @property {String|null} [otp]
 * @property {String|null} [timestamp]
 * @property {String|null} [signature]
 * */

/**
 * @typedef {Object} RequestFqdnOptions
 * @property {BeameAuthorizationToken|null} [token]
 * @property {String|null} [parentFqdn]
 * @property {FqdnMetadata|null} [metadata]
 * @property {bool|null} [useBeameAuthData]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {String|null} error
 */

const config            = require('../../config/Config');
const path              = require('path');
const _                 = require('underscore');
const DirectoryServices = require('./DirectoryServices');


class BeameStoreDataServices {


	constructor(fqdn) {
		this._certsDir         = config.localCertsDirV2;
		this.directoryServices = new DirectoryServices();
		this._fqdn             = fqdn;
	}

	readObject(name) {
		let p = path.join(this._certsDir, this._fqdn, name);
		return DirectoryServices.readObject(p);
	}

	writeObject(name, data) {
		let folderPath = path.join(this._certsDir, this._fqdn);
		this._createDir();
		DirectoryServices.saveFile(folderPath, name, data);
	}

	readMetadataSync() {
		return DirectoryServices.readMetadataSync(this._certsDir, this._fqdn);
	}

	writeMetadataSync(metadata) {
		this._createDir();
		if(metadata && metadata.message && (typeof metadata.message === 'string')){
			let metaJson = JSON.parse(metadata.message);
			if(metaJson){
				if(metaJson.level)metadata.level = metaJson.level;
				if(metaJson.parent_fqdn)metadata.parent_fqdn= metaJson.parent_fqdn;
			}
		}
		DirectoryServices.writeMetadataSync(this._certsDir, this._fqdn, metadata);
	}

	_createDir() {
		DirectoryServices.createDir(path.join(this._certsDir, this._fqdn));
	}

	deleteDir(callback) {
		DirectoryServices.deleteFolder(path.join(this._certsDir, this._fqdn), callback);
	}

	/**
	 *
	 * @param {Credential} cred
	 */
	setFolder(cred) {
		if (!_.isEmpty(cred) && cred.hasOwnProperty("metadata")) {
			cred.metadata.path = path.join(this._certsDir, this._fqdn);
		}
	}
}


module.exports = BeameStoreDataServices;
