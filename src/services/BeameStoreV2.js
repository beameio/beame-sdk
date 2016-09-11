//
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


//const exec        = require('child_process').exec;
const config      = require('../../config/Config');
const module_name = config.AppModules.BeameStore;
const logger      = new (require('../utils/Logger'))(module_name);
const provApi     = new (require('./ProvisionApi'))();
const Credential  = require('./Credential');
const _           = require('underscore');
const async       = require('async');

let _store = null;

class BeameStoreV2 {

	constructor() {
		this.directoryServices = new (require('./DirectoryServices'))();

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
		this.directoryServices.mkdirp(config.localCertsDirV2 + "/").then(function () {
			this.directoryServices.scanDir(config.localCertsDirV2 + "/").forEach(fqdn => {
				let credentials = new Credential(this);
				credentials.initFromData(fqdn);
				this.addCredential(credentials, fqdn);
				// there is no parent node in the store. still a to decice weather i want to request the whole tree.
				// for now we will keep it at the top level, and as soon as parent is added to the store it will getMetadataKey reassigned
				// just a top level credential or a credential we are placing on top, untill next one is added
			});
		}).catch(function(error){
			logger.error(error.toString())
		});

	}

	addCredential(credentials) {
		let parent_fqdn = credentials.getMetadataKey(config.MetadataProperties.PARENT_FQDN);
		let parentNode  = parent_fqdn && this.search(parent_fqdn)[0];
		if (!parent_fqdn || !parentNode) {
			this.credentials[credentials.getMetadataKey("FQDN")] = credentials;
			this.reassignCredentials(credentials);
		}
		else {
			//
			// check if credentials has parent fqdn, and if so we are moving it down.
			//
			parentNode.children.push(credentials);
			credentials.parent = parentNode;
			// if it was located on the top level now we need to 0 it would, since we put it in the proper location in the tree.
			if (this.credentials[credentials.getMetadataKey('FQDN')]) {
				this.credentials[credentials.getMetadataKey('FQDN')] = null;
				delete this.credentials[credentials.getMetadataKey("FQDN")];
			}
			this.reassignCredentials(credentials);
		}
	}

	toJSON() {
		return "huj";
	}

	reassignCredentials(currentNode) {
		let fqdnsWithoutParent      = Object.keys(this.credentials).filter(fqdn => {
			return this.credentials[fqdn].getMetadataKey('PARENT_FQDN') === currentNode.getMetadataKey('FQDN')
		});
		let credentialsWitoutParent = fqdnsWithoutParent.map(x => this.credentials[x]);
		credentialsWitoutParent.forEach(item => {
			currentNode.children.push(item);
			this.credentials[item.getMetadataKey("FQDN")] = null;
			delete this.credentials[item.getMetadataKey("FQDN")];
			item.parent = currentNode;
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
			if(searchArray.hasOwnProperty(item)){
				//	console.log(`comparing ${searchArray[item].getMetadataKey("FQDN")} ${fqdn}`);
				if (searchArray[item].getMetadataKey("FQDN") === fqdn) {
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

	/*list(regex, searchArray){
	 if(!searchArray){
	 searchArray = this.credentials;
	 }
	 let result = this.list(fqdn, searchArray);

	 return [result];
	 }*/

	/**
	 *
	 * @param regex
	 * @param {Array} searchArray
	 * @returns {Array}
	 */
	list(regex, searchArray) {
		//console.log(`starting _search ${fqdn}`);
		if (!searchArray) {
			searchArray = this.credentials;
		}
		let results = [];

		for (let item in searchArray) {
			//	console.log(`comparing ${searchArray[item].getMetadataKey("FQDN")} ${fqdn}`);
			if (!searchArray[item]) {
				continue;
			}
			if (searchArray[item].getMetadataKey("FQDN").match(regex)) {
				results.push(searchArray[item]);
			}
			if (searchArray[item].children) {
				let result = this.list(regex, searchArray[item].children);
				if (!result) {
					continue;
				}
				results = results.concat(result);
			}
		}
		return results;
	};


	addToStore(x509) {
		let credential = new Credential(this);
		credential.initFromX509(x509);
		this.addCredential(credential);
	};

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

					let dirPath = newCred.metadata.path;

					self.directoryServices.mkdirp(dirPath).then(function(){
						self.directoryServices.saveFile(dirPath, config.metadataFileName, metadata, function (error) {
							if (!error) {
								var cred = self.getCredential(fqdn);
								resolve(cred);
							}
							else {
								reject(error);
							}
						});
					}).catch(reject);


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
						function (data) {
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

		return new Promise(
			(resolve, reject) => {

				/** @type {RemoteCreds} */
				var payload = {
					metadata: null,
					x509:     null
				};

				async.parallel(
					[
						function (callback) {
							var requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.s3MetadataFileName;
							provApi.getRequest(requestPath, function (error, data) {
								if (!error) {
									payload.metadata = typeof(data) == "object" ? data : JSON.parse(data);
									callback(null, data);
								}
								else {
									callback(error);
								}
							});
						},
						function (callback) {
							var requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.CertFileNames.X509;
							provApi.getRequest(requestPath, function (error, data) {
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
							reject(error, null);
							return;
						}

						resolve(payload);

					}
				);

			}
		);
	}


	// if (beameStoreInstance) {
	// 	return beameStoreInstance;
	// }
	//
	// this.ensureFreshBeameStore();
	//
	// beameStoreInstance = this;
}

module.exports = BeameStoreV2;
