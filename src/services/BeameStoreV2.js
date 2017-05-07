// Created by Zeev Glozman
// Beame.io Ltd, 2016.

'use strict';

/** @namespace BeameStoreV2 **/


/**
 * @typedef {Object} RemoteCreds
 * @property {Object} metadata
 * @property {String} x509
 */

/**
 * S3 public metadata.json structure, should be compliant to backend EntityMetadata Class
 * @typedef {Object} S3Metadata
 * @property {String} level
 * @property {String} fqdn
 * @property {String|null} parent_fqdn
 */

const path                = require('path');
const util                = require('util');
const config              = require('../../config/Config');
const module_name         = config.AppModules.BeameStore;
const BeameLogger         = require('../utils/Logger');
const logger              = new BeameLogger(module_name);
const ProvisionApi        = require('./ProvisionApi');
const Credential          = require('./Credential');
const async               = require('async');
const BeameUtils          = require('../utils/BeameUtils');
const CommonUtils         = require('../utils/CommonUtils');
const DirectoryServices   = require('./DirectoryServices');
const Config              = require('../../config/Config');
const CertValidationError = Config.CertValidationError;

let _store = null;

/** Class representing Beame Store*/
class BeameStoreV2 {

	constructor() {
		this.directoryServices = new DirectoryServices();

		if (_store === null) {
			_store = this;
		}
		else {
			return _store;
		}

		this.credentials = {};
		this.init();
	}

	init() {

		DirectoryServices.createDir(config.rootDir);
		DirectoryServices.createDir(config.localCertsDirV2);

		this.directoryServices.scanDir(config.localCertsDirV2).forEach(fqdn => {
			let cred = new Credential(this);
			cred.initFromData(fqdn);
			this.addCredential(cred);
		});
	}

	//noinspection JSUnusedGlobalSymbols
	fetch(fqdn) {

		if (!fqdn) {
			return Promise.reject('Credential#find: fqdn is a required argument');
		}

		/**
		 * @param {RemoteCreds} data
		 */
		const _saveCreds = data => {

			return new Promise(resolve => {
					let remoteCred = new Credential(this);
					remoteCred.initFromX509(data.x509, data.metadata);
					remoteCred.initFromData(fqdn);
					this.addCredential(remoteCred);
					remoteCred.saveCredentialsObject();
					resolve(remoteCred);
				}
			);
		};

		if (config.ApprovedZones.some(zone_name => fqdn.endsWith(zone_name))) {
			return this.getRemoteCreds(fqdn).then(_saveCreds);
		}
		else {
			return Promise.reject('Unknown domain');
		}

	}

	/**
	 * Find local credential or get remote
	 * @public
	 * @method BeameStoreV2.find
	 * @param {String} fqdn
	 * @param {Boolean} [allowRemote]
	 * @returns {Promise.<Credential>}
	 */
	find(fqdn, allowRemote = true) {

		return new Promise((resolve, reject) => {
				if (!fqdn) {
					reject('Credential#find: fqdn is a required argument');
					return;
				}

				const _validateNewCred  = newCred =>{
					newCred.checkValidity()
							.then(resolve)
							.catch(reject);
				};

				const _renewCred = () => {
					this.fetch(fqdn)
						.then(_validateNewCred)
						.catch(reject);
				};

				const _onValidationError = (credential, certError) => {
					if (certError.errorCode === CertValidationError.Expired && !credential.hasKey("PRIVATE_KEY")) {
						_renewCred();
					}
					else {
						reject(certError);
					}
				};

				const _onCredFound = credential => {
					credential.checkValidity()
						.then(credential.updateOcspStatus.bind(credential))
						.then(resolve)
						.catch(_onValidationError.bind(null, credential));
				};

				let cred = this._getCredential(fqdn);

				if (cred) {
					//refresh metadata info
					cred.metadata = cred.beameStoreServices.readMetadataSync(cred.metadata.path);
					_onCredFound(cred);
				} else {
					if (!allowRemote) {
						reject(`Credential ${fqdn} was not found locally and allowRemote is false`);
						return;
					}
					this.fetch(fqdn)
						.then(_onCredFound)
						.catch(reject);
				}

			}
		);


	}

	addCredential(credential) {
		let parent_fqdn = credential.getMetadataKey(config.MetadataProperties.PARENT_FQDN),
		    fqdn        = credential.fqdn;

		if (this.credentials[fqdn]) {
			logger.error(`Credentials for fqdn ${fqdn} are already present`);
			return;
		}

		let parentNode = parent_fqdn && this._getCredential(parent_fqdn);
		if (parentNode) {
			parentNode.children.push(credential);
			credential.parent = parentNode;
		}
		else {
			this.credentials[fqdn] = credential;
		}
		this.adoptChildren(credential);
	}

	adoptChildren(currentNode) {
		let children = Object.keys(this.credentials).filter(fqdn => {
			return this.credentials[fqdn].getMetadataKey('PARENT_FQDN') === currentNode.fqdn
		}).map(x => this.credentials[x]);
		children.forEach(child => {
			currentNode.children.push(child);
			this.credentials[child.fqdn] = null;
			delete this.credentials[child.fqdn];
			child.parent = currentNode;
		});
	}

	/**
	 * Return credential from local Beame store
	 * @public
	 * @method BeameStoreV2.getCredential
	 * @param {String} fqdn
	 * @returns {Credential}
	 */
	getCredential(fqdn) {
		return this._getCredential(fqdn);
	}

	/**
	 * Return credential from local Beame store
	 * @private
	 * @method BeameStoreV2._getCredential
	 * @param {String} fqdn
	 * @returns {Credential}
	 */
	_getCredential(fqdn) {
		let results = BeameUtils.findInTree({children: this.credentials}, cred => cred.fqdn == fqdn, 1);
		return results.length == 1 ? results[0] : null;
	}

	//noinspection JSUnusedGlobalSymbols
	search(fqdn) {
		return BeameUtils.findInTree({children: this.credentials}, cred => cred.fqdn == fqdn);
	}

	/**
	 * @public
	 * @method BeameStoreV2.shredCredentials
	 * @param {String} fqdn
	 * @param callback
	 */
	shredCredentials(fqdn, callback) {
		// XXX: Fix callback to getMetadataKey (err, data) instead of (data)
		// XXX: Fix exit code
		let item = this._getCredential(fqdn);
		if (item) {
			item.shred(callback);
		}
	}

	/**
	 * @public
	 * @method BeameStoreV2.list
	 * @param {String|null} [regex]
	 * @param {Object|null} [options]
	 * @returns {Array}
	 */
	list(regex, options) {
		regex   = regex || '.';
		options = options || {};
		return BeameUtils.findInTree(
			{children: this.credentials},
			cred => {

				let allEnvs = !!options.allEnvs,
					envPattern = config.EnvProfile.FqdnPattern,
					approvedZones = config.ApprovedZones;

				if(!allEnvs && (!cred.fqdn || !(cred.fqdn.indexOf(envPattern)>0))){
					if(cred.metadata && ! cred.metadata.live)
					return false;
				}

				if(options.anyParent && !cred.hasLocalParentAtAnyLevel(options.anyParent)) {
					return false;
				}

				if(options.hasParent && !cred.hasParent(options.hasParent)) {
					return false;
				}

				if(options.excludeRevoked && cred.metadata.revoked) {
					return false;
				}

				//noinspection JSCheckFunctionSignatures
				if (!(cred.fqdn && cred.fqdn.match(regex))) {
					return false;
				}

				//noinspection RedundantIfStatementJS,JSUnresolvedVariable
				if (options.hasPrivateKey == true && !cred.hasKey('PRIVATE_KEY')) {
					return false;
				}
				else { //noinspection JSUnresolvedVariable
					if (options.hasPrivateKey == false && cred.hasKey('PRIVATE_KEY')) {
						return false;
					}
				}

				if(options.expiration || options.expiration === 0 ){
					let expired = new Date(cred.getCertEnd());

					if(CommonUtils.addDays(null,options.expiration) < expired){
						return false;
					}
				}



				return true;
			}
		);
	}

	//noinspection JSUnusedGlobalSymbols
	hasLocalChildren(fqdn){
	   return  !!this.list(null, {
			hasParent: fqdn
		}).length;
	}

	//noinspection JSUnusedGlobalSymbols
	addToStore(x509) {
		let credential = new Credential(this);
		credential.initFromX509(x509);
		this.addCredential(credential);
		return credential;
	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 * @ignore
	 * @param {String} fqdn
	 * @param {String} parentFqdn
	 * @param {SignatureToken} token
	 * @returns {Promise.<Credential>}
	 */
	getNewCredentials(fqdn, parentFqdn, token) {

		return new Promise((resolve, reject) => {
				//noinspection JSDeprecatedSymbols
				let parentCreds     = parentFqdn ? this.getCredential(parentFqdn) : null;
				let parentPublicKey = parentCreds && parentCreds.getPublicKeyNodeRsa();

				const loadCred = (metadata) => {
					let newCred = new Credential(this);

					newCred.initWithFqdn(fqdn, metadata);

					this.addCredential(newCred);

					newCred.saveCredentialsObject();

					//noinspection JSDeprecatedSymbols
					let cred = this.getCredential(fqdn);

					cred ? resolve(cred) : reject(`Credential not loaded`);

				};

				if (parentCreds && parentPublicKey) {
					if (parentCreds.checkSignature(token)) {
						loadCred({parent_fqdn: parentFqdn, fqdn: fqdn});
					}
				} else {
					this.getRemoteCreds(parentFqdn).then(
						/**
						 * @param {RemoteCreds} data
						 * @returns {*}
						 */
						data => {
							let remoteCred = new Credential(this);
							remoteCred.initFromX509(data.x509, data.metadata);
							remoteCred.initFromData(fqdn);
							this.addCredential(remoteCred);

							if (remoteCred.checkSignature(token)) {
								loadCred(data.metadata);
							}

						}).catch(reject);
				}
			}
		);

	}; // returns a new Credential object.

	/**
	 * return metadata.json stored in public S3 bucket
	 * @ignore
	 * @param {String} fqdn
	 * @returns {Promise.<RemoteCreds>}
	 */
	getRemoteCreds(fqdn) {

		return new Promise((resolve, reject) => {

				/** @type {RemoteCreds} */
				let payload      = {
					metadata: null,
					x509:     null
				};
				let provisionApi = new ProvisionApi();

				const _onMetaReceived = (callback, error, data) => {
					if (!error) {
						payload.metadata = typeof(data) == "object" ? data : CommonUtils.parse(data);
						callback(null, data);
					}
					else {
						callback(error);
					}
				};

				const _onX509Received = (callback, error, data) => {
					if (!error) {
						payload.x509 = typeof(data) == "object" && data.hasOwnProperty("message") ? data.message : data;
						callback(null, data);
					}
					else {
						callback(error);
					}
				};

				async.parallel(
					[
						(callback) => {
							let requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.s3MetadataFileName;
							provisionApi.makeGetRequest(requestPath, null, _onMetaReceived.bind(this, callback), null, 3);
						},
						(callback) => {
							let requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.CertFileNames.X509;
							provisionApi.makeGetRequest(requestPath, null, _onX509Received.bind(this, callback), null, 3);
						}

					],
					(error) => {
						if (error) {
							logger.error(`Get remote creds error ${BeameLogger.formatError(error)}`);
							reject(error, null);
							return;
						}

						resolve(payload);

					}
				);

			}
		);
	}

}


module.exports = BeameStoreV2;
