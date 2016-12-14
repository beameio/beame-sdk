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

const path              = require('path');
const util              = require('util');
const config            = require('../../config/Config');
const module_name       = config.AppModules.BeameStore;
const BeameLogger       = require('../utils/Logger');
const logger            = new BeameLogger(module_name);
const ProvisionApi      = require('./ProvisionApi');
const Credential        = require('./Credential');
const async             = require('async');
const BeameUtils        = require('../utils/BeameUtils');
const CommonUtils       = require('../utils/CommonUtils');
const DirectoryServices = require('./DirectoryServices');

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
					this.addCredential(remoteCred);
					remoteCred.saveCredentialsObject();
					resolve(remoteCred);
				}
			);
		};

		if (fqdn.indexOf('beameio.net') > 0) {
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
	find(fqdn, allowRemote) {

		if (!fqdn) {
			return Promise.reject('Credential#find: fqdn is a required argument');
		}

		let cred = this._getCredential(fqdn);

		if (cred) {
			return Promise.resolve(cred);
		}

		if (typeof allowRemote === 'undefined') {
			allowRemote = true;
		}

		if (!allowRemote) {
			return Promise.reject(`Credential ${fqdn} was not found locally and allowRemote is false`);
		}

		return this.fetch(fqdn);
	}

	addCredential(credential) {
		let parent_fqdn = credential.getMetadataKey(config.MetadataProperties.PARENT_FQDN),
		    fqdn        = credential.fqdn;

		if (this.credentials[fqdn]) {
			logger.fatal(`Credentials for fqdn ${fqdn} are already present`);
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
	 * @deprecated
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
				return true;
			}
		);
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
				let parentCreds     = this.getCredential(parentFqdn);
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
				let payload = {
					metadata: null,
					x509:     null
				};

				async.parallel(
					[
						function (callback) {
							let requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.s3MetadataFileName;
							ProvisionApi.getRequest(requestPath, function (error, data) {
								if (!error) {
									payload.metadata = typeof(data) == "object" ? data : CommonUtils.parse(data);
									callback(null, data);
								}
								else {
									callback(error);
								}
							});
						},
						function (callback) {
							let requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.CertFileNames.X509;
							ProvisionApi.getRequest(requestPath, function (error, data) {
								if (!error) {
									payload.x509 = typeof(data) == "object" && data.hasOwnProperty("message") ? data.message : data;
									callback(null, data);
								}
								else {
									callback(error);
								}
							});
						}

					],
					function (error) {
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

//noinspection JSDeprecatedSymbols
BeameStoreV2.prototype.getCredential = util.deprecate(
	BeameStoreV2.prototype.getCredential,
	'BeameStoreV2#getCredential is deprecated. Use BeameStoreV2#find instead. Use --trace-deprecation NodeJS flag for trace.'
);

module.exports = BeameStoreV2;
