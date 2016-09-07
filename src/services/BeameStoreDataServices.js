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

const os            = require('os');
const home          = os.homedir();
const homedir       = home;
const config        = require('../../config/Config');
const module_name = config.AppModules.BeameEntity;
const BeameLogger   = require('../utils/Logger');
const logger        = new BeameLogger(module_name);
const provisionApi  = new (require('../services/ProvisionApi'))();
const apiActions    = require('../../config/ApiConfig.json').Actions;
const beameUtils    = require('../utils/BeameUtils');
const path 		  = require('path');

class BeameStoreDataServices {


	constructor(fqdn, store) {
		/** @member {Object} **/
		this.directoryServices  = new (require('./DirectoryServices'))();
		this.fqdn = fqdn;
		this._store = store;
	}

	/**
	 *
	 * @param {FqdnMetadata} metadata
	 * @returns {ValidationResult}
	 * @private
	 */
	static _validateZeroLevelMetadata(metadata) {

		/** @type {ValidationResult} **/
		var result = {
			"isValid": true,
			"error":   null
		};

		if (!metadata.email) {
			result.error = 'Email required';
			return result;
		}

		if (!metadata.name) {
			result.error = 'Name required';
			return result;
		}

		return result;
	}
	readObject(name){
		let p = path.join(config.localCertsDirV2, this.fqdn, name);
		return this.directoryServices.readObject(p);
	}

	writeObject(name, data){
		let folderPath = path.join(config.localCertsDirV2, this.fqdn);
		this.directoryServices.createDir(folderPath );
		return this.directoryServices.saveFile(folderPath, name, data);
	}

	readMetadataSync(){
		return this.directoryServices.readMetadataSync(config.localCertsDirV2, this.fqdn);
	}
	/**
	 * request fqdn
	 * @param {RequestFqdnOptions} options
	 * @returns {*}
	 */
	getFqdn(options) {

		if (options.useBeameAuthData === true) {

			return this._getZeroLevelFqdnWithBeamePermissions(options.metadata);
		}

		if (options.parentFqdn) {
			var parentCredentials = this._store.search(options.parentFqdn)[0];
			if (parentCredentials.hasPrivateKey() === true) {
				//
				// We can use the local credentials to issue the request.
				//
				//
				return this._getFqdnWithLocalParentFqdn(parentCredentials,options.metadata);
			}

		}

		if (options.token && options.token.authenticationUrl) {
			return this._getFqdnNameWithAuthorizationToken(options.token);
		}
	}


	/**
	 *
	 * @param {Credential} parentCredentials
	 * @param {FqdnMetadata} metadata
	 * @returns {Promise.<string>}
	 * @private
	 */
	_getFqdnWithLocalParentFqdn(parentCredentials,metadata) {
		return new Promise(
			(resolve, reject) => {



			}
		);
	}

	/**
	 *
	 * @param {FqdnMetadata} metadata
	 * @returns {Promise.<string>}
	 * @private
	 */
	_getZeroLevelFqdnWithBeamePermissions(metadata) {
		return new Promise(
			(resolve, reject) => {
				//validate input
				var validationResult = this._validateZeroLevelMetadata(metadata);
				if (!validationResult.isValid) {
					reject(validationResult.error);
					return;
				}

				//do post to provision
				provisionApi.setAuthData(beameUtils.getAuthToken(homedir, config.beameZeroLevelAuthData.PK_PATH, config.beameZeroLevelAuthData.CERT_PATH));

				var postData = {
					name:  metadata.name,
					email: metadata.email
				};

				var apiData = beameUtils.getApiData(apiActions.DeveloperApi.CreateDeveloper.endpoint, postData, true);

				logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.Registering, email);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.Registered, payload.hostname);

						resolve(payload.hostname);
					}
					else {
						reject(error);
					}

				});
			}
		);
	}

	/**
	 *
	 * @param {BeameAuthorizationToken} authToken
	 * @private
	 */
	_getFqdnNameWithAuthorizationToken(authToken) {
		return new Promise(
			(resolve, reject) => {

			}
		);
	}



	getCerts(csr) {
	}


}


module.exports = BeameStoreDataServices;