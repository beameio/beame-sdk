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

/**
 * @typedef {Object} VerifyAncestryOptions
 * @property {String|undefined} [highestFqdn]  up to zero
 * @property {Number|undefined} [trustDepth] down to infinity
 * @property {Boolean|undefined} [allowExpired] = false
 * @property {Boolean|undefined} [allowApprovers] = true
 */

 /**
 * @typedef {Object} FetchCredChainOptions
 * @property {String|undefined} [highestFqdn]  up to zero
 * @property {Boolean|undefined} [allowRevoked] = false
 * @property {Boolean|undefined} [allowExpired] = false
 * @property {Boolean|undefined} [allowApprovers] = true
 */

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
const CertValidationError = config.CertValidationError;
const assert              = require('assert').strict;

let _store = null;

/** Class representing Beame Store*/
class BeameStoreV2 {

	constructor() {
		if (_store !== null) {
			return _store;
		}
		_store = this;

		DirectoryServices.createDir(config.rootDir);
		DirectoryServices.createDir(config.localCertsDirV2);
		DirectoryServices.createDir(config.localLogDir);
		this.reload();
	}

	reload() {
		this.credentials = {};

		this.directoryServices = new DirectoryServices();
		this.directoryServices.scanDir(config.localCertsDirV2).forEach((fqdn) => {
			let cred = new Credential(this);
			cred.initFromData(fqdn);
			this.addCredential(cred);
		});
	}

	async fetch(fqdn) {
		assert(fqdn, 'Credential#find: fqdn is a required argument');

		const _saveCreds = data => {
			const remoteCred = new Credential(this);
			remoteCred.initFromX509(data.x509, data.metadata);
			remoteCred.initFromData(fqdn);
			this.addCredential(remoteCred);
			remoteCred.saveCredentialsObject();
			return remoteCred;
		};

		logger.info(`Fetching ${fqdn}`);
		assert(config.ApprovedZones.some(zone_name => fqdn.endsWith(zone_name)), 'Unknown domain');
		const data = await this.getRemoteCreds(fqdn);
		return _saveCreds(data);
	}

	getParent(cred) {
		let altParents = cred.certData &&  cred.certData.altNames ? cred.certData.altNames.filter(x => x.startsWith(config.AltPrefix.Parent)) : [];

		if (altParents.length === 1) {
			let parent = altParents[0];

			return parent.substr(config.AltPrefix.Parent.length);
		}

		return cred.metadata.parent_fqdn && cred.metadata.parent_fqdn.length ? cred.metadata.parent_fqdn : null;
	}

	getApprover(cred) {
		let altApprovers = cred.certData &&  cred.certData.altNames ? cred.certData.altNames.filter(x => x.startsWith(config.AltPrefix.Approver)) : [];

		if (altApprovers.length === 1) {
			let approver = altApprovers[0];

			return approver.substr(config.AltPrefix.Approver.length);
		}

		return cred.metadata.approved_by_fqdn && cred.metadata.approved_by_fqdn.length ? cred.metadata.approved_by_fqdn : null;
	}

	/**
	 * identityIsInRange
	 *
	 * verify if identity satisfies provided conditions by using
	 * accessConfig file or default settings
	 *
	 * *********** accessConfig format: **********************
	 * {
	* "ACL":"zzz.bbb.beameio.net, yyy.xxx.beameio.net, *.nnn.beameio.net, *.yyy.*",
	* "ANCHOR":"ggg.kkk.beameio.net, iii.beameio.net",
	* "HIGH":"ddd.beameio.net",
	* "DEPTH":3
	* }
	 * ********************************************************
	 *
	 * ANCHOR is used as valid HIGH from out-of-band tree with same provided DEPTH
	 *
	 * default DEPTH = 99
	 * default HIGH = localAuthFqdn
	 *
	 **/
	identityIsInRange(ownFqdn, guestFqdn, accessConfig) {
		return new Promise((resolve, reject) => {
			try {
				let accObj = typeof accessConfig === 'object' ? accessConfig : JSON.parse(accessConfig);

				let acl         = accObj['ACL'] ? CommonUtils.splitOptions(accObj['ACL']) : null;
				let anchor      = accObj['ANCHOR'] ? CommonUtils.splitOptions(accObj['ANCHOR'], true) : null;
				let highestFqdn = accObj['HIGH'] ? accObj['HIGH'] : ownFqdn;
				let depth       = accObj['DEPTH'] ? Number.isInteger(parseInt(accObj['DEPTH'])) ? parseInt(accObj['DEPTH']) : 99 : 99;
				if (acl) {//if ACL, required explicit HIGH to allow local creds, or ANCHOR to allow remote creds
					for (let i = 0; i < acl.length; i++) {
						if (guestFqdn.match(new RegExp(acl[i]))) {
							resolve();
							return;
						}

					}
					if (!anchor && !accObj['HIGH'] && !(anchor || anchor && (anchor.length < 1))) {
						reject();
						return;
					}
				}

				/** @type {VerifyAncestryOptions} **/
				let options = {
					highestFqdn: highestFqdn,
					trustDepth:  depth
				};

				const _cb = (error, related) => {
					if (!related) {
						let ndx       = 0;
						let isRelated = (i) => {
							if (i < anchor.length) {

								/** @type {VerifyAncestryOptions} **/
								let opt = {
									highestFqdn: anchor[i],
									trustDepth:  depth
								};

								const _cb1 = (error, status) => {
									if (status) {
										related = true;
										resolve();
									}
									else
										isRelated(++ndx);
								};

								this.verifyAncestry(anchor[i], guestFqdn, opt, _cb1);
							}
							else
								reject();
						};
						isRelated(ndx);
					}
					else resolve();
				};

				this.verifyAncestry(ownFqdn, guestFqdn, options, _cb);
			}
			catch (e) {
				console.error('Failed to verify access for:', guestFqdn, '..', e);
				reject();
			}
		});

	}

	/**
	 * Fetch cred tree up to L0 or highestFqdn
	 * @public
	 * @method BeameStoreV2.fetchCredChain
	 * @param {String} fqdn
	 * @param {FetchCredChainOptions} options
	 * @param {function} callback
	 */
	fetchCredChain(fqdn, options, callback) {

		let highestFqdn = options.highestFqdn,
		    allowExpired = options.allowExpired == undefined ? false : options.allowExpired,
		    allowRevoked = options.allowRevoked == undefined ? false : options.allowRevoked,
		    allowApprovers = options.allowApprovers == undefined ? true : options.allowApprovers;

		let credsList = [], nLevels = 0;

		const getNext = (fqdn) => {
			this.find(fqdn, true, allowExpired, allowRevoked).then(cred => {
				credsList[nLevels] = cred;
				let approverFqdn   = this.getApprover(cred),
				    parentFqdn     = this.getParent(cred),
				    nextFqdn       = parentFqdn || (allowApprovers && approverFqdn);

				if (!(credsList[nLevels].metadata && credsList[nLevels].metadata.level)) {

					let isZeroLevel = cred.fqdn.match(/^\w*\.\w{2}\.\w{1}\.beameio\.net$/);
					if (isZeroLevel) {
						credsList[nLevels].metadata.level = 0;
					}
					else if (credsList.length > 0) {
						callback(null, credsList);
						return;
					}
					else {
						callback('invalid metadata', null);
						return;
					}
				}

				if(nLevels > 300) throw new Error(`Max depth of 300 reached for chain ${nextFqdn}... Skipping`); // more than 300 depth something has to be wrong

				if ((credsList[nLevels].metadata.level > 0 || nextFqdn) &&
					(!highestFqdn || (highestFqdn && (highestFqdn !== credsList[nLevels].fqdn))) &&
					!credsList.some(item => item.fqdn === nextFqdn)) // avoid loops
				{
					nLevels++;
					getNext(nextFqdn);
				}
				else {
					callback(null, credsList);
				}
			}).catch(error => {
				if (credsList.length < 1)
					callback(error, null);
				else {
					logger.error(error);
					callback(null, credsList);
				}
			});
		};

		getNext(fqdn);
	}

	/**
	 * Find common ancestor up to highestLevel down to (current + trustLevel)
	 * @public
	 * @method BeameStoreV2.verifyAncestry
	 * @param {String} srcFqdn
	 * @param {String} guestFqdn
	 * @param {VerifyAncestryOptions} options
	 * @param {function} callback
	 */
	verifyAncestry(srcFqdn, guestFqdn, options, callback) {

		let highestFqdn    = options.highestFqdn,
		    trustDepth     = options.trustDepth,
		    allowExpired   = options.allowExpired == undefined ? false : options.allowExpired,
		    allowApprovers = options.allowApprovers == undefined ? true : options.allowApprovers;

		const localChainCallback = (guestChain, error, lclChain) => {
			if (!error && lclChain && (!Number.isInteger(trustDepth) ||
					(guestChain[0].metadata.level <= trustDepth + lclChain[0].metadata.level))) {
				for (let iLcl = 0; iLcl < lclChain.length; iLcl++) {
					for (let jGuest = 0; jGuest < guestChain.length; jGuest++) {
						if (guestChain[jGuest].fqdn === lclChain[iLcl].fqdn) {
							callback(null, true);
							return;
						}
					}
				}
				callback(null, false);
			}
			else {
				logger.error(`verifyAncestry::localChain error ${BeameLogger.formatError(error)}`);
				callback(null, false);
			}
		};

		const guestChainCallback = (error, guestChain) => {
			if (!error && guestChain) {

				/** @type {FetchCredChainOptions} **/
				let optLocal = {
					highestFqdn,
					allowExpired,
					allowRevoked:false,
					allowApprovers
				};

				this.fetchCredChain(srcFqdn, optLocal, localChainCallback.bind(this, guestChain))
			}
			else {
				logger.error(`verifyAncestry::guestChain error ${BeameLogger.formatError(error)}`);
				callback(null, false);
			}
		};

		/** @type {FetchCredChainOptions} **/
		let optGuest = {
			highestFqdn : null,
			allowExpired,
			allowRevoked:false,
			allowApprovers
		};

		this.fetchCredChain(guestFqdn, optGuest, guestChainCallback)
	}


	/**
	 * Find local credential or get remote
	 * @public
	 * @method BeameStoreV2.find
	 * @param {String} fqdn
	 * @param {undefined|Boolean} [allowRemote]
	 * @param {undefined|Boolean} [allowExpired] //set only for automatic renewal of crypto-validated remote creds
	 * @param {undefined|Boolean} [allowRevoked] //set only for automatic renewal of crypto-validated remote creds
	 * @returns {Promise.<Credential>}
	 */
	async find(fqdn, allowRemote = true, allowExpired = false, allowRevoked = false) {
		assert(fqdn, 'Credential#find: fqdn is a required argument');

		// get the credential to use
		let credential = this.getCredential(fqdn);
		if (credential) {
			credential.metadata = credential.beameStoreServices.readMetadataSync(); //refresh metadata info
			if(allowRemote && credential.expired) { // if credential is expired, try to fetch a new one
				credential = await this.fetch(fqdn);
			}
		} else {
			assert(allowRemote, `Credential ${fqdn} was not found locally and allowRemote is false`);
			credential = await this.fetch(fqdn);
		}
		assert(credential, `Credential ${fqdn} was not found!`);

		// check validity if allowed
		if(!allowExpired) {
			credential.checkValidity();
		}

		// check ocsp status if allowed
		if(!allowRevoked) {
			assert(await credential.checkOcspStatus(credential) !== config.OcspStatus.Revoked,
				`Credential ${fqdn} is revoked and allowRevoked is false`);
		}

		return credential;
	}

	addCredential(credential) {
		let parent_fqdn = credential.getMetadataKey(config.MetadataProperties.PARENT_FQDN),
		    fqdn        = credential.fqdn;

		if (this.credentials[fqdn]) {
			logger.info(`Credentials for fqdn ${fqdn} are already present`);
			return;
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

	get Credentials() {
		return BeameUtils.findInTree({children: this.credentials}, cred => {
			return cred.fqdn
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
		if(!fqdn) {
			throw new Error('BeameStoreV2#getCredential called without fqdn');
		}
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
		let item = this.getCredential(fqdn);
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

				// noinspection JSUnresolvedVariable
				let allEnvs       = !!options.allEnvs,
				    envPattern    = config.SelectedProfile.FqdnPattern,
				    approvedZones = config.ApprovedZones,
				    zone          = cred.fqdn ? cred.fqdn.split('.').slice(-2).join('.') : null,
				    today         = new Date();


				//TODO fix .v1. hack
				if (!allEnvs && (!cred.fqdn || (approvedZones.includes(zone) && cred.fqdn.indexOf('.v1.') > 0 && !(cred.fqdn.indexOf(envPattern) > 0)))) {
					return false;
				}

				// noinspection JSUnresolvedVariable
				if (options.anyParent && !cred.hasLocalParentAtAnyLevel(options.anyParent)) {
					return false;
				}

				// noinspection JSUnresolvedVariable
				if (options.hasParent && !cred.hasParent(options.hasParent)) {
					return false;
				}

				let expirationDate = new Date(cred.getCertEnd());

				// noinspection JSUnresolvedVariable
				if (options.excludeValid && !cred.revoked) {
					return false;
				}

				// noinspection JSUnresolvedVariable
				if (options.excludeRevoked && cred.revoked) {
					return false;
				}

				// noinspection JSUnresolvedVariable
				if (options.excludeActive && expirationDate > today) {
					return false;
				}
				else { // noinspection JSUnresolvedVariable
					if (options.excludeExpired && expirationDate < today) {
						return false;
					}
				}

				//noinspection JSCheckFunctionSignatures
				if (!(cred.fqdn && cred.fqdn.match(regex))) {
					return false;
				}

				//noinspection RedundantIfStatementJS,JSUnresolvedVariable
				if (options.hasPrivateKey == true && !cred.hasPrivateKey) {
					return false;
				}
				else { //noinspection JSUnresolvedVariable
					if (options.hasPrivateKey == false && cred.hasPrivateKey) {
						return false;
					}
				}

				// noinspection JSUnresolvedVariable
				if (options.expiration || options.expiration === 0) {
					// noinspection JSUnresolvedVariable
					if (CommonUtils.addDays(null, options.expiration) < expirationDate) {
						return false;
					}
				}


				return true;
			}
		);
	}

	getActiveLocalCreds() {
		return new Promise((resolve) => {

				let list = this.list(null, {
					hasPrivateKey:  true,
					excludeRevoked: true,
					excludeExpired: true
				});


				resolve(list.map(item => {
					return {fqdn: item.fqdn, name: item.metadata.name ? `${item.metadata.name} (${item.fqdn})` : item.fqdn}
				}));
			}
		);
	}

	//noinspection JSUnusedGlobalSymbols
	hasLocalChildren(fqdn) {
		return !!this.list(null, {
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
				let parentPublicKey = parentCreds && parentCreds.publicKeyNodeRsa;

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

				// noinspection JSUnresolvedFunction
				async.parallel(
					[
						(callback) => {
							let requestPath = config.SelectedProfile.CertEndpoint + '/' + fqdn + '/' + config.s3MetadataFileName;
							provisionApi.makeGetRequest(requestPath, null, _onMetaReceived.bind(this, callback), null, 3);
						},
						(callback) => {
							let requestPath = config.SelectedProfile.CertEndpoint + '/' + fqdn + '/' + config.CertFileNames.X509;
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


	/**
	 * @returns {BeameStoreV2}
	 */
	static getInstance() {
		if (_store === null) {
			new BeameStoreV2();
		}
		return _store;
	}

}


module.exports = BeameStoreV2;
