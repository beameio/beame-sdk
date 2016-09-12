/** jshint esversion: 6 **/
'use strict';

/**
 * @typedef {Object} FqdnMetadata
 * @property {String|null} [name]
 * @property {String|null} [email]
 * @property {String|null} [local_ip]
 * @property {String|null} [edge_fqdn]
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

const config       = require('../../config/Config');
const module_name  = config.AppModules.BeameEntity;
const BeameLogger  = require('../utils/Logger');
const logger       = new BeameLogger(module_name);
const beameUtils   = require('../utils/BeameUtils');
const path         = require('path');
const _            = require('underscore');


class BeameStoreDataServices {


	constructor(fqdn) {
		this._certsDir = config.localCertsDirV2;
		this.directoryServices = new (require('./DirectoryServices'))();
		this.fqdn              = fqdn;
	}

	readObject(name) {
		let p = path.join(this._certsDir, this.fqdn, name);
		return this.directoryServices.readObject(p);
	}

	writeObject(name, data) {
		let folderPath = path.join(this._certsDir, this.fqdn);
		this.directoryServices.createDir(folderPath);
		return this.directoryServices.saveFile(folderPath, name, data);
	}

	readMetadataSync() {
		return this.directoryServices.readMetadataSync(this._certsDir, this.fqdn);
	}

	writeMetadataSync(metadata){
		return this.directoryServices.writeMetadataSync( this._certsDir, this.fqdn, metadata);
	}

	/**
	 *
	 * @param {Credential} cred
	 */
	setFolder(cred) {
		if (!_.isEmpty(cred) && cred.hasOwnProperty("metadata")) {
			cred.metadata.path = path.join(this._certsDir, this.fqdn);
		}
	}
}


module.exports = BeameStoreDataServices;
