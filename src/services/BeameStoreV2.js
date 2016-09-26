// Created by Zeev Glozman
// Beame.io Ltd, 2016.

'use strict';

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

		DirectoryServices.createDir(config.localCertsDirV2);

		this.directoryServices.scanDir(config.localCertsDirV2).forEach(fqdn => {
			let cred = new Credential(this);
			cred.initFromData(fqdn);
			this.addCredential(cred);
		});
	}

	//noinspection JSUnusedGlobalSymbols
	fetch(fqdn) {
		return new Promise((resolve, reject) => {
				if (fqdn.indexOf('beameio.net') > 0) {
					this.getRemoteCreds(fqdn).then(
						/**
						 * @param {RemoteCreds} data
						 */
						data => {
							let remoteCred = new Credential(this);
							remoteCred.initFromX509(data.x509, data.metadata);
							this.addCredential(remoteCred);
							remoteCred.saveCredentialsObject();
							resolve(remoteCred)
						}
					).catch(reject);
				}
			}
		);
	}


	addCredential(credential) {
		let parent_fqdn = credential.getMetadataKey(config.MetadataProperties.PARENT_FQDN),
		    fqdn        = credential.fqdn;

		if (this.credentials[fqdn]) {
			throw new Error(`Credentials for fqdn ${fqdn} are already present`);
		}

		let parentNode = parent_fqdn && this.getCredential(parent_fqdn);
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
	 *
	 * @param {String} fqdn
	 * @param {Array.<Credential>} [searchArray]
	 * @returns {Array.<Credential>}
	 */
	search(fqdn, searchArray) {
		if (!searchArray) {
			searchArray = this.credentials;
		}
		let result = this._search(fqdn, searchArray);

		return [result];
	}

	/**
	 *
	 * @param {String} fqdn
	 * @returns {Credential}
	 */
	getCredential(fqdn) {
		var results = this.search(fqdn);
		return results && results.length == 1 ? results[0] : null;
	}

	/**
	 *
	 * @param fqdn
	 * @param {Array.<Credential>} searchArray
	 * @returns {*}
	 * @private
	 */
	_search(fqdn, searchArray) {
		//console.log(`starting _search fqdn=${fqdn} sa=`, searchArray);
		for (let item in searchArray) {
			if (searchArray.hasOwnProperty(item)) {
				//	console.log(`comparing ${searchArray[item].getMetadataKey("FQDN")} ${fqdn}`);
				if (searchArray[item].fqdn === fqdn) {
					return searchArray[item];
				}
				if (searchArray[item].children) {
					let result = this._search(fqdn, searchArray[item].children);
					if (!result) {
						continue;
					}
					return result;
				}
			}
		}
		return null;
	};

	shredCredentials(fqdn, callback) {
		// XXX: Fix callback to getMetadataKey (err, data) instead of (data)
		// XXX: Fix exit code
		let item = this.getCredential(fqdn);
		if (item) {
			item.shred(callback);
		}
	}

	/**
	 *
	 * @param {String} regex
	 * @param {Array|null} [searchArray]
	 * @returns {Array}
	 */
	list(regex, searchArray) {

		//console.log(`starting _search ${fqdn}`);
		if (!searchArray) {
			searchArray = this.credentials;
		}
		let results = [];

		for (let k in searchArray) {
			let creds = searchArray[k];
			//	console.log(`comparing ${searchArray[item].getMetadataKey("FQDN")} ${fqdn}`);
			if (!creds) {
				// WHY CAN THIS HAPPEN?
				continue;
			}
			if (!creds.fqdn) {
				continue;
			}
			if (creds.fqdn.match(regex)) {
				results.push(creds);
			}
			if (creds.children) {
				// WHY DO WE NEED THIS?
				let result = this.list(regex, creds.children);
				if (!result) {
					continue;
				}
				results = results.concat(result);
			}
		}
		return results;
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
	 *
	 * @param {String} fqdn
	 * @param {String} parentFqdn
	 * @param {SignatureToken} token
	 * @returns {Promise.<Credential>}
	 */
	getNewCredentials(fqdn, parentFqdn, token) {
		var self = this;

		return new Promise((resolve, reject) => {
				let parentCreds     = this.getCredential(parentFqdn);
				let parentPublicKey = parentCreds && parentCreds.getPublicKeyNodeRsa();

				function loadCred(metadata) {
					let newCred = new Credential(self);

					newCred.initWithFqdn(fqdn, metadata);

					self.addCredential(newCred);

					newCred.saveCredentialsObject();

					var cred = self.getCredential(fqdn);

					cred ? resolve(cred) : reject(`Credential not loaded`);

				}

				if (parentCreds && parentPublicKey) {
					if (parentCreds.checkSignatureToken(token)) {
						loadCred({parent_fqdn: parentFqdn, fqdn: fqdn});
					}
				} else {
					this.getRemoteCreds(parentFqdn).then(
						/**
						 * @param {RemoteCreds} data
						 * @returns {*}
						 */
						data => {
							let remoteCred = new Credential(self);
							remoteCred.initFromX509(data.x509, {parent_fqdn: parentFqdn, fqdn: fqdn});
							self.addCredential(remoteCred);

							if (remoteCred.checkSignatureToken(token)) {
								loadCred(data.metadata);
							}

						}).catch(reject);
				}
			}
		);

	}; // returns a new Credential object.

	/**
	 * return metadata.json stored in public S3 bucket
	 * @param {String} fqdn
	 * @returns {Promise.<RemoteCreds>}
	 */
	getRemoteCreds(fqdn) {

		return new Promise((resolve, reject) => {

				/** @type {RemoteCreds} */
				var payload = {
					metadata: null,
					x509:     null
				};

				async.parallel(
					[
						function (callback) {
							var requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.s3MetadataFileName;
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
							var requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.CertFileNames.X509;
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

module.exports = BeameStoreV2;
