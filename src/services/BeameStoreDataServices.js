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

const os           = require('os');
const home         = os.homedir();
const homedir      = home;
const config       = require('../../config/Config');
const module_name  = config.AppModules.BeameEntity;
const BeameLogger  = require('../utils/Logger');
const logger       = new BeameLogger(module_name);
const provisionApi = new (require('../services/ProvisionApi'))();
const apiActions   = require('../../config/ApiConfig.json').Actions;
const beameUtils   = require('../utils/BeameUtils');
const path         = require('path');
const _            = require('underscore');


class BeameStoreDataServices {


	constructor(fqdn) {

		this.directoryServices = new (require('./DirectoryServices'))();
		this.fqdn              = fqdn;
	}

	readObject(name) {
		let p = path.join(config.localCertsDirV2, this.fqdn, name);
		return this.directoryServices.readObject(p);
	}

	writeObject(name, data) {
		let folderPath = path.join(config.localCertsDirV2, this.fqdn);
		this.directoryServices.createDir(folderPath);
		return this.directoryServices.saveFile(folderPath, name, data);
	}

	readMetadataSync() {
		return this.directoryServices.readMetadataSync(config.localCertsDirV2, this.fqdn);
	}

	writeMetadataSync(metadata){
		return this.directoryServices.writeMetadataSync(config.localCertsDirV2, this.fqdn, metadata);
	}

	/**
	 *
	 * @param {Credential} cred
	 */
	setFolder(cred) {
		if (!_.isEmpty(cred) && cred.hasOwnProperty("metadata")) {
			cred.metadata.path = path.join(config.localCertsDirV2, this.fqdn);
		}
	}
}


module.exports = BeameStoreDataServices;
