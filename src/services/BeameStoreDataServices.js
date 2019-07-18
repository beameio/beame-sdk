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
		this._fqdn             = fqdn;
	}

	getAbsoluteDirName() {
		return path.join(this._certsDir, this._fqdn);
	}

	getAbsoluteFileName(name) {
		return path.join(this._certsDir, this._fqdn, name);
	}

	readObject(name) {
		return DirectoryServices.readObject(this.getAbsoluteFileName(name));
	}

	writeObject(name, data) {
		this._createDir();
		DirectoryServices.saveFile(this.getAbsoluteFileName(name), data);
	}

	readMetadataSync() {
		const ret = DirectoryServices.readMetadataSync(this._certsDir, this._fqdn);

		// Upgrade from previous file format - start
		delete ret.revoked;
		delete ret.path;
		// Upgrade from previous file format - end

		return ret;
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

}


module.exports = BeameStoreDataServices;
