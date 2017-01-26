//
// Created by Zeev Glozman
// Beame.io Ltd, 2016.
//
/*jshint esversion: 6 */
"use strict";

/** @namespace Credential **/

/**
 * @typedef {Object} MetadataObject
 * @property {String} fqdn
 * @property {String|null} [parent_fqdn]
 * @property {String|null} [name]
 * @property {String|null} [email]
 * @property {Number} level
 * @property {String|null} [local_ip] => local IP address(for future use)
 * @property {String|null} [edge_fqdn] => edge server FQDN
 * @property {String} path => path to local creds folder
 */

/**
 * @typedef {Object} SignedData
 * @property {Number} created_at
 * @property {Number} valid_till
 * @property {Object|String|null} data
 */

/** @typedef {Object} RegistrationTokenOptionsToken
 *  @property {String} fqdn
 *  @property {String|null|undefined} [name]
 *  @property {String|null|undefined} [email]
 *  @property {String|null|undefined} [userId]
 *  @property {Number|null|undefined} [ttl]
 *  @property {String|null|undefined} [src]
 *  @property {String|null|undefined} [serviceName]
 *  @property {String|null|undefined} [serviceId]
 *  @property {String|null|undefined} [matchingFqdn]
 */

/**
 * signature token structure , used as AuthorizationToken in Provision
 * @typedef {Object} SignatureToken
 * @property {String} signedData
 * @property {String} signedBy
 * @property {String} signature
 */
const pem                    = require('pem');
const NodeRsa                = require("node-rsa");
const async                  = require('async');
const _                      = require('underscore');
const url                    = require('url');
const provisionSettings      = require('../../config/ApiConfig.json');
const config                 = require('../../config/Config');
const module_name            = config.AppModules.BeameStore;
const logger_level           = "Credential";
const BeameLogger            = require('../utils/Logger');
const logger                 = new BeameLogger(module_name);
const BeameStoreDataServices = require('../services/BeameStoreDataServices');
const OpenSSlWrapper         = new (require('../utils/OpenSSLWrapper'))();
const beameUtils             = require('../utils/BeameUtils');
const CommonUtils            = require('../utils/CommonUtils');
const ProvisionApi           = require('../services/ProvisionApi');
const apiEntityActions       = require('../../config/ApiConfig.json').Actions.EntityApi;
const apiAuthServerActions   = require('../../config/ApiConfig.json').Actions.AuthServerApi;
const DirectoryServices      = require('./DirectoryServices');
const CryptoServices         = require('../services/Crypto');

const timeFuzz               = 5*1000; // 5 seconds

class CertificateValidityError extends Error {
}

/**
 * You should never initiate this class directly, but rather always access it through the beameStore.
 *
 *
 */
class Credential {

	/**
	 *
	 * @param {BeameStoreV2} store
	 */
	constructor(store) {
		if (store) {
			//noinspection JSUnresolvedVariable
			/** @member {BeameStoreV2}*/
			this.store = store;
		}

		//noinspection JSUnresolvedVariable
		/** @member {String} */
		this.fqdn = null;

		/** @member {MetadataObject} */
		this.metadata = {};

		/** @member {Array.<Credential>} */
		this.children = [];


		// cert files
		/** @member {Buffer}*/
		this.PRIVATE_KEY = null;
		/** @member {Buffer}*/
		this.CA = null;
		/** @member {Buffer}*/
		this.X509 = null;
		/** @member {Buffer}*/
		this.PKCS7 = null;
		/** @member {Buffer}*/
		this.PKCS12 = null;
		/** @member {Buffer}*/
		this.P7B = null;
		/**
		 * @member {Buffer}
		 * Password for PKCS12(pfx) file
		 */
		this.PWD = null;

		/**
		 * @member {String}
		 * Public key as PEM string
		 */
		this.publicKeyStr = null;

		/** @member {NodeRSA}*/
		this.publicKeyNodeRsa = null;

		/** @member {NodeRSA}*/
		this.privateKeyNodeRsa = null;

		/**
		 * Object represents X509 properties: issuer {country, state, locality, organization, organizationUnit, commonName, emailAddress}, serial,country,state,locality,organization,organizationUnit, commonName,emailAddress,san and validity
		 * @member {Object}
		 */
		this.certData = {};
	}

	//region Init functions
	/**
	 * @ignore
	 * @param fqdn
	 * @param metadata
	 */
	initWithFqdn(fqdn, metadata) {
		//noinspection JSUnresolvedVariable
		this.fqdn = fqdn;

		/** @member {BeameStoreDataServices} */
		this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this.store, this.parseMetadata(metadata));
		this.parseMetadata(metadata);
		this.beameStoreServices.setFolder(this);
	}

	/**
	 * @ignore
	 * @param fqdn
	 */
	initFromData(fqdn) {
		//noinspection JSUnresolvedVariable
		this.fqdn               = fqdn;
		this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this.store);
		this.loadCredentialsObject();
		this.initCryptoKeys();
	}

	/**
	 * @ignore
	 */
	initCryptoKeys() {
		if (this.hasKey("X509")) {
			pem.config({sync: true});
			pem.readCertificateInfo(this.getKey("X509") + "", (err, certData) => {
				if (this.fqdn && this.fqdn !== certData.commonName) {
					throw new Error(`Credentialing mismatch ${this.metadata} the common name in x509 does not match the metadata`);
				}
				this.certData           = err ? null : certData;
				//noinspection JSUnresolvedVariable
				this.fqdn               = this.extractCommonName();
				this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this.store);
			});

			pem.getPublicKey(this.getKey("X509") + "", (err, publicKey) => {
				this.publicKeyStr     = publicKey.publicKey;
				this.publicKeyNodeRsa = new NodeRsa();
				try {
					this.publicKeyNodeRsa.importKey(this.publicKeyStr, "pkcs8-public-pem");
				} catch (e) {
					console.log(`could not import services ${this.publicKeyStr}`)
				}
			});
			pem.config({sync: false});
		}
		if (this.hasKey("PRIVATE_KEY")) {
			this.privateKeyNodeRsa = new NodeRsa();
			this.privateKeyNodeRsa.importKey(this.getKey("PRIVATE_KEY") + " ", "private");
		}
	}

	/**
	 * @ignore
	 * @param x509
	 * @param metadata
	 */
	initFromX509(x509, metadata) {
		pem.config({sync: true});
		pem.readCertificateInfo(x509, (err, certData) => {
			if (!err) {
				this.certData           = certData;
				this.beameStoreServices = new BeameStoreDataServices(certData.commonName, this.store);
				this.metadata.fqdn      = certData.commonName;
				//noinspection JSUnresolvedVariable
				this.fqdn               = certData.commonName;
				this.beameStoreServices.writeObject(config.CertificateFiles.X509, x509);
			}
		});
		pem.getPublicKey(x509, (err, publicKey) => {
			this.publicKeyStr     = publicKey.publicKey;
			this.publicKeyNodeRsa = new NodeRsa();
			try {
				this.publicKeyNodeRsa.importKey(this.publicKeyStr, "pkcs8-public-pem");
			} catch (e) {
				console.log(`Error could not import ${this.publicKeyStr}`);
			}
		});
		this.parseMetadata(metadata);
		this.beameStoreServices.setFolder(this);
		this.beameStoreServices.writeMetadataSync(this.metadata);
		pem.config({sync: false});
	}

	/**
	 * @ignore
	 * @param pubKeyDerBase64
	 */
	initFromPubKeyDer64(pubKeyDerBase64) {
		this.publicKeyNodeRsa = new NodeRsa();
		this.publicKeyNodeRsa.importKey('-----BEGIN PUBLIC KEY-----\n' + pubKeyDerBase64 + '-----END PUBLIC KEY-----\n', "pkcs8-public-pem");
	}

	/**
	 * @ignore
	 * @param importCred
	 */
	initFromObject(importCred) {
		if (!importCred || !importCred.metadata) {
			return;
		}

		for (let key in config.CertFileNames) {
			if (config.CertFileNames.hasOwnProperty(key) && importCred.hasOwnProperty(key)) {
				this[key] = new Buffer(importCred[key]).toString();
			}

		}

		for (let key in config.MetadataProperties) {
			//noinspection JSUnfilteredForInLoop
			let value = config.MetadataProperties[key];
			if (importCred.metadata.hasOwnProperty(value)) {
				this.metadata[value] = importCred.metadata[value];
			}
		}
		this.initCryptoKeys();
		this.beameStoreServices.setFolder(this);
	}

	//endregion

	//region Save/load services
	/**
	 * Delete Credential folder from Beame Store
	 * @public
	 * @method Credential.shred
	 * @param callback
	 */
	shred(callback) {
		this.beameStoreServices.deleteDir(callback);
	}

	/**
	 * @ignore
	 */
	saveCredentialsObject() {
		if (!this || !this.metadata || !this.metadata.path) {
			return;
		}

		Object.keys(config.CertificateFiles).forEach(keyName => {
			this[keyName] && this.beameStoreServices.writeObject(config.CertFileNames[keyName], this[keyName]);
		});

		try {
			this.beameStoreServices.writeMetadataSync(this.metadata);
			//noinspection encies,nodemodulesdependencies
		} catch (e) {
			logger.debug("read cert data error " + e.toString());
		}
	}

	/**
	 * @ignore
	 */
	loadCredentialsObject() {
		Object.keys(config.CertFileNames).forEach(keyName => {
			try {
				this[keyName] = this.beameStoreServices.readObject(config.CertFileNames[keyName]);
			} catch (e) {
				//console.log(`exception ${e}`);
			}
		});

		try {
			let metadata = this.beameStoreServices.readMetadataSync();
			//noinspection es6modulesdependencies,nodemodulesdependencies
			_.map(metadata, (value, key) => {
				this.metadata[key] = value;
			});
		} catch (e) {
			logger.debug("read cert data error " + e.toString());
		}
	}

	//endregion

	//region GET and common helpers
	parseMetadata(metadata) {
		if (!_.isEmpty(metadata)) {
			_.map(metadata, (value, key) => {
				this.metadata[key] = value;
			});
		}
	}

	//noinspection JSUnusedGlobalSymbols
	toJSON() {
		let ret = {
			metadata: {}
		};

		for (let key in config.CertFileNames) {
			if (config.CertFileNames.hasOwnProperty(key)) {
				ret[key] = this[key];
			}

		}

		for (let key in config.MetadataProperties) {
			if (config.MetadataProperties.hasOwnProperty(key)) {
				ret.metadata[config.MetadataProperties[key]] = this.metadata[config.MetadataProperties[key]];
			}
		}

		return ret;
	}

	getMetadataKey(field) {
		return this.metadata.hasOwnProperty(field.toLowerCase()) || this.metadata.hasOwnProperty(field) ? (this.metadata[field.toLowerCase()] || this.metadata[field]) : null;
	}

	hasKey(key) {
		//key = key.toLowerCase();
		return (this.hasOwnProperty(key) && !_.isEmpty(this[key])) || (this.hasOwnProperty(key.toLowerCase()) && !_.isEmpty(this[key.toLowerCase()]))
	}

	getKey(key) {
		//key = key.toLowerCase();
		return this.hasKey(key) ? (this[key] || this[key.toLowerCase()]) : null;
	}

	//noinspection JSUnusedGlobalSymbols
	extractCommonName() {
		return this.certData ? this.certData.commonName : null;
	}

	getPublicKeyNodeRsa() {
		return this.publicKeyNodeRsa;
	}

	getPublicKeyDER64() {
		const pubKeyLines = this.publicKeyStr.split('\n');
		return pubKeyLines.slice(1, pubKeyLines.length - 1).join('\n');
	}

	getPrivateKeyNodeRsa() {
		return this.privateKeyNodeRsa;
	}

	//endregion

	//region Crypto functions
	/**
	 * Sign given data with local Beame store Credential
	 * @public
	 * @method Credential.sign
	 * @param {String|Object} data
	 * @returns {SignatureToken|null}
	 */
	sign(data) {

		try {
			let message = {
				signedData: data,
				signedBy:   "",
				signature:  ""
			};

			if (this.hasKey("PRIVATE_KEY")) {
				message.signedBy = this.fqdn;
			}
			//noinspection ES6ModulesDependencies,NodeModulesDependencies,JSCheckFunctionSignatures
			message.signature = this.privateKeyNodeRsa.sign(message.signedData, "base64", "utf8");
			return message;
		} catch (e) {
			logger.error(`sign failed with ${BeameLogger.formatError(e)}`);
			return null;
		}
	}

	/**
	 * @public
	 * @method Credential.checkSignature
	 * @param {SignatureToken} data
	 * @returns {boolean}
	 */
	checkSignature(data) {
		let rsaKey = this.getPublicKeyNodeRsa();
		let status = rsaKey.verify(data.signedData, data.signature, "utf8", "base64");
		if (status) {
			logger.info(`Signature signed by ${data.signedBy} verified successfully`);
		}
		else {
			logger.warn(`Invalid signature signed by ${data.signedBy}`);
		}

		return status;
	}

	/**
	 * Create Auth token
	 * @ignore
	 * @param {String} signWithFqdn
	 * @param {String|null} [dataToSign]
	 * @param {Number|null|undefined} [ttl]
	 * @returns {Promise.<String|null>}
	 */
	signWithFqdn(signWithFqdn, dataToSign, ttl) {
		return new Promise((resolve, reject) => {
				if (!signWithFqdn) {
					reject('SignedWith FQDN parameter required');
					return;
				}
				//noinspection JSDeprecatedSymbols
				let signCred = this.store.getCredential(signWithFqdn);

				if (!signCred) {
					reject(`Credential ${signWithFqdn} not found in store`);
					return;
				}

				if (!signCred.hasKey("PRIVATE_KEY")) {
					reject(`Credential ${signWithFqdn} hasn't private key for signing`);
					return;
				}
				const AuthToken = require('./AuthToken');

				let authToken = AuthToken.create(dataToSign || Date.now(), signCred, ttl || 60 * 5);

				if (!authToken) {
					reject(`Sign data failure, please see logs`);
					return;
				}

				resolve(authToken);
			}
		);

	}

	/**
	 * @public
	 * @method Credential.encryptWithRSA
	 * @param {String} data
	 * @returns {EncryptedMessage}
	 */
	encryptWithRSA(data) {
		let targetRsaKey = this.getPublicKeyNodeRsa();
		if (!targetRsaKey) {
			throw new Error("encrypt failure, public key not found");
		}
		return targetRsaKey.encrypt(data, "base64", "utf8");
	}

	/**
	 * @public
	 * @method Credential.encrypt
	 * @param {String} fqdn
	 * @param {String} data
	 * @param {String|null} [signingFqdn]
	 * @returns {EncryptedMessage}
	 */
	encrypt(fqdn, data, signingFqdn) {
		let signingCredential;
		if (signingFqdn) {
			//noinspection JSDeprecatedSymbols
			signingCredential = this.store.getCredential(signingFqdn);
		}

		let sharedCiphered = CryptoServices.aesEncrypt(data);

		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let symmetricCipherElement = JSON.stringify(sharedCiphered[1]);
		sharedCiphered[1]          = "";

		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		/** @type {EncryptedMessage} */
		let encryptedUnsignedMessage = {
			rsaCipheredKeys: this.encryptWithRSA(symmetricCipherElement),
			data:            sharedCiphered[0],
			encryptedFor:    fqdn
		};
		if (signingCredential) {
			return signingCredential.sign(encryptedUnsignedMessage);
		}

		return encryptedUnsignedMessage;
	}

	/**
	 * @public
	 * @method Credential.decryptWithRSA
	 * @param {String} data
	 * @returns {EncryptedMessage}
	 */
	decryptWithRSA(data) {
		if (!this.hasKey("PRIVATE_KEY")) {
			throw new Error(`private key for ${this.fqdn} not found`);
		}
		let rsaKey = this.getPrivateKeyNodeRsa();

		return rsaKey.decrypt(data);
	}

	/**
	 * @public
	 * @method Credential.decrypt
	 * @param {Object} encryptedMessage
	 * @returns {*}
	 */
	decrypt(encryptedMessage) {

		if (encryptedMessage.signature) {
			//noinspection JSDeprecatedSymbols
			let signingCredential = this.store.getCredential(encryptedMessage.signedBy);

			if (!signingCredential) {
				throw new Error("Signing credential is not found in the local store");
			}

			if (!signingCredential.checkSignature({
					signedData: encryptedMessage.signedData,
					signedBy:   encryptedMessage.signedBy,
					signature:  encryptedMessage.signature
				})) {
				return null;
			}

			encryptedMessage = encryptedMessage.signedData;
		}

		let decryptedMessage = this.decryptWithRSA(encryptedMessage.rsaCipheredKeys);
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let payload          = JSON.parse(decryptedMessage);

		let decipheredPayload = CryptoServices.aesDecrypt([
			encryptedMessage.data,
			payload,
		]);

		if (!decipheredPayload) {
			throw new Error("Decrypting, No message");
		}
		return decipheredPayload;
	}

	//endregion

	//region Entity manage
	//region create entity
	/**
	 * Create entity service with local credentials
	 * @param {String} parent_fqdn => required
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 */
	createEntityWithLocalCreds(parent_fqdn, name, email) {
		return new Promise((resolve, reject) => {
				if (!parent_fqdn) {
					reject('Parent Fqdn required');
					return;
				}
				//noinspection JSDeprecatedSymbols
				let parentCred = this.store.getCredential(parent_fqdn);

				if (!parentCred) {
					reject(`Parent credential ${parent_fqdn} not found`);
					return;
				}

				let metadata, edge_fqdn;

				const onEdgeServerSelected = edge => {
					edge_fqdn = edge.endpoint;
					metadata  = {
						parent_fqdn,
						name,
						email,
						edge_fqdn
					};

					let postData = Credential.formatRegisterPostData(metadata),
					    apiData  = ProvisionApi.getApiData(apiEntityActions.RegisterEntity.endpoint, postData),
					    api      = new ProvisionApi();

					api.setClientCerts(parentCred.getKey("PRIVATE_KEY"), parentCred.getKey("P7B"));

					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registering, parent_fqdn);

					//noinspection ES6ModulesDependencies,NodeModulesDependencies
					api.runRestfulAPI(apiData, (error, payload) => {
						if (error) {
							reject(error);
							return;
						}
						//set signature to consistent call of new credentials
						this.signWithFqdn(parent_fqdn, payload).then(authToken => {
							payload.sign = authToken;

							this._requestCerts(payload, metadata).then(this._onCertsReceived.bind(this, payload.fqdn, edge_fqdn)).then(resolve).catch(reject);
						}).catch(reject);

					});
				};

				this._selectEdge().then(onEdgeServerSelected.bind(this)).catch(reject);
			}
		);
	}

	/**
	 * Create entity service with local credentials
	 * @param {String} parent_fqdn => required
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @param {String|null} [src]
	 * @param {String|null} [serviceName]
	 * @param {String|null} [serviceId]
	 * @param {String|null} [matchingFqdn]
	 */
	createRegistrationWithLocalCreds(parent_fqdn, name, email, src, serviceName, serviceId, matchingFqdn) {
		return new Promise((resolve, reject) => {
				if (!parent_fqdn) {
					reject('Parent Fqdn required');
					return;
				}
				//noinspection JSDeprecatedSymbols
				let parentCred = this.store.getCredential(parent_fqdn);

				if (!parentCred) {
					reject(`Parent credential ${parent_fqdn} not found`);
					return;
				}


				let metadata = {
					parent_fqdn,
					name,
					email,
					serviceName,
					serviceId,
					matchingFqdn,
					src: src || config.RegistrationSource.Unknown
				};

				let postData = Credential.formatRegisterPostData(metadata),
				    apiData  = ProvisionApi.getApiData(apiEntityActions.RegisterEntity.endpoint, postData),
				    api      = new ProvisionApi();

				api.setClientCerts(parentCred.getKey("PRIVATE_KEY"), parentCred.getKey("P7B"));

				logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registering, parent_fqdn);

				//noinspection ES6ModulesDependencies,NodeModulesDependencies
				api.runRestfulAPI(apiData, (error, payload) => {
					if (error) {
						reject(error);
						return;
					}

					if (src) {
						payload.src = src;
					}

					resolve({
						parentCred,
						payload
					});

				});

			}
		);
	}

	/**
	 * @ignore
	 * @param {String} authToken
	 * @param {String|null} [authSrvFqdn]
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 */
	createEntityWithAuthServer(authToken, authSrvFqdn, name, email) {
		return new Promise((resolve, reject) => {
				let metadata, edge_fqdn;

				if (!authToken) {
					reject('Auth token required');
					return;
				}

				logger.debug("createEntityWithAuthServer(): Selecting proxy");

				const onEdgeServerSelected = edge => {

					logger.debug("createEntityWithAuthServer(): onEdgeServerSelected");
					let authServerFqdn = (authSrvFqdn && 'https://' + authSrvFqdn) || config.authServerURL;

					edge_fqdn = edge.endpoint;

					metadata = {
						name,
						email,
						edge_fqdn
					};
					let api  = new ProvisionApi();

					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registering, authServerFqdn);

					api.postRequest(
						authServerFqdn + apiAuthServerActions.RegisterEntity.endpoint,
						Credential.formatRegisterPostData(metadata),
						fqdnResponseReady.bind(this),
						authToken,
						5
					);
				};

				/**
				 * @param error
				 * @param payload
				 * @this {Credential}
				 */
				const fqdnResponseReady = (error, payload) => {
					logger.debug("createEntityWithAuthServer(): fqdnResponseReady", payload);
					if (error) {
						reject(error);
						return;
					}

					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registered, payload.fqdn);

					this._requestCerts(payload, metadata).then(this._onCertsReceived.bind(this, payload.fqdn, edge_fqdn)).then(resolve).catch(reject);
				};

				this._selectEdge().then(onEdgeServerSelected.bind(this)).catch(reject);
			}
		);

	}

	/**
	 * @ignore
	 * @param {String} authToken
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @returns {Promise}
	 */
	createEntityWithAuthToken(authToken, name, email) {
		return new Promise((resolve, reject) => {
				let metadata, edge_fqdn;

				if (!authToken) {
					reject('Auth token required');
					return;
				}

				let tokenObj = CommonUtils.parse(authToken);

				if (!tokenObj) {
					reject('Invalid Auth token');
					return;
				}

				logger.debug("createEntityWithAuthToken(): Selecting proxy");

				const onEdgeServerSelected = edge => {

					edge_fqdn = edge.endpoint;

					metadata = {
						name,
						email,
						parent_fqdn: tokenObj.signedBy,
						edge_fqdn,
					};


					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registering, metadata.parent_fqdn);

					let postData = Credential.formatRegisterPostData(metadata),
					    apiData  = ProvisionApi.getApiData(apiEntityActions.RegisterEntity.endpoint, postData),
					    api      = new ProvisionApi();

					api.runRestfulAPI(apiData,
						fqdnResponseReady.bind(this),
						'POST',
						authToken
					);
				};

				/**
				 * @param error
				 * @param payload
				 * @this {Credential}
				 */
				const fqdnResponseReady = (error, payload) => {
					logger.debug("createEntityWithAuthServer(): fqdnResponseReady");
					if (error) {
						reject(error);
						return;
					}

					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registered, payload.fqdn);

					payload.sign = authToken;

					this._requestCerts(payload, metadata).then(this._onCertsReceived.bind(this, payload.fqdn, edge_fqdn)).then(resolve).catch(reject);

				};


				this._selectEdge().then(onEdgeServerSelected.bind(this)).catch(reject);
			}
		);

	}

	createEntityWithRegistrationToken(token){
		let type = token.type || config.RequestType.RequestWithAuthServer;

		switch (type) {
			case config.RequestType.RequestWithAuthServer:
				return this.createEntityWithAuthServer(token.authToken, token.authSrvFqdn, token.name, token.email);
			case config.RequestType.RequestWithParentFqdn:
				return this.createEntityWithAuthToken(token.authToken, token.name, token.email);
			case config.RequestType.RequestWithFqdn:

				let aut        = CommonUtils.parse(token.authToken),
				    signedData = CommonUtils.parse(aut.signedData.data),
				    payload    = {
					    fqdn:        signedData.fqdn,
					    parent_fqdn: aut.signedBy,
					    sign:        token.authToken
				    },
				    metadata   = {
					    name:  token.name,
					    email: token.email
				    };

				return this.requestCerts(payload, metadata);
			default:
				return Promise.reject(`Unknown request type`);
		}
	}

	/**
	 * Create registration token for child of given fqdn
	 * @param {RegistrationTokenOptionsToken} options
	 * @returns {Promise}
	 */
	createRegistrationToken(options) {

		return new Promise((resolve, reject) => {

				const AuthToken = require('./AuthToken');

				this.createRegistrationWithLocalCreds(options.fqdn, options.name, options.email, options.src, options.serviceName, options.serviceId, options.matchingFqdn).then(data => {

					let payload     = data.payload,
					    parent_cred = data.parentCred;


					let authToken = AuthToken.create({fqdn: payload.fqdn}, parent_cred, options.ttl || 60 * 60 * 24 * 2),
					    token     = {
						    authToken: authToken,
						    name:      options.name,
						    email:     options.email,
						    type:      config.RequestType.RequestWithFqdn
					    },
					    str       = new Buffer(CommonUtils.stringify(token, false)).toString('base64');

					resolve(str);
				}).catch(reject);
			}
		);

	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 * Create registration token for child of given fqdn
	 * @param {RegistrationTokenOptionsToken} options
	 * @returns {Promise}
	 */
	createMobileRegistrationToken(options) {

		return new Promise((resolve, reject) => {

				const AuthToken = require('./AuthToken');

				this.createRegistrationWithLocalCreds(options.fqdn, options.name, options.email, options.src, options.serviceName, options.serviceId, options.matchingFqdn).then(data => {

					let payload     = data.payload,
					    parent_cred = data.parentCred;


					let authToken = AuthToken.create({fqdn: payload.fqdn}, parent_cred, options.ttl || 60 * 60 * 24 * 2),
					    token     = {
						    authToken:    authToken,
						    name:         options.name,
						    email:        options.email,
						    usrId:        options.userId,
						    src:          options.src,
						    level:        payload.level,
						    serviceName:  options.serviceName,
						    serviceId:    options.serviceId,
						    matchingFqdn: options.matchingFqdn,
						    type:         config.RequestType.RequestWithFqdn,
						    imageRequired:options.imageRequired
					    },
					    str       = new Buffer(CommonUtils.stringify(token, false)).toString('base64');

					resolve(str);
				}).catch(reject);
			}
		);

	}

	//endregion

	//region certs
	/**
	 *  @ignore
	 * @returns {Promise.<String>}
	 */
	createCSR(cred, dirPath) {

		const fqdn       = this.fqdn,
		      pkFileName = config.CertFileNames.PRIVATE_KEY;

		return new Promise(function (resolve, reject) {

			cred._createInitialKeyPairs(dirPath).then(() => {
				let pkFile = beameUtils.makePath(dirPath, pkFileName);
				OpenSSlWrapper.createCSR(fqdn, pkFile).then(resolve).catch(reject);
			}).catch(reject);


			// OpenSSlWrapper.createPrivateKey().then(pk => {
			// 	DirectoryServices.saveFile(dirPath, pkFileName, pk, error => {
			// 		if (!error) {
			// 			let pkFile = beameUtils.makePath(dirPath, pkFileName);
			// 			OpenSSlWrapper.createCSR(fqdn, pkFile).then(resolve).catch(reject);
			// 		}
			// 		else {
			// 			errMsg = logger.formatErrorMessage("Failed to save Private Key", module_name, {"error": error}, config.MessageCodes.OpenSSLError);
			// 			reject(errMsg);
			// 		}
			// 	})
			// }).catch(function (error) {
			// 	reject(error);
			// });

		});
	}

	/**
	 * @ignore
	 * @param {String} csr
	 * @param {SignatureToken} authToken
	 * @param {Object} pubKeys
	 */
	getCert(csr, authToken, pubKeys) {
		let fqdn = this.fqdn;


		return new Promise((resolve, reject) => {
				let postData = {
					    csr:  csr,
					    fqdn: fqdn,
					    //TODO uncomment for hvca
					    validity: 60 * 60 * 24 * 30,
					    pub:      pubKeys
				    },
				    api      = new ProvisionApi(),
				    apiData  = ProvisionApi.getApiData(apiEntityActions.CompleteRegistration.endpoint, postData);

				logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.RequestingCerts, fqdn);

				//noinspection ES6ModulesDependencies,NodeModulesDependencies
				api.runRestfulAPI(apiData, (error, payload) => {
					this._saveCerts(error, payload).then(resolve).catch(reject);
				}, 'POST', JSON.stringify(authToken));
			}
		);
	}

	requestCerts(payload, metadata) {
		return new Promise((resolve, reject) => {

				const onEdgeServerSelected = edge => {
					metadata.edge_fqdn = edge.endpoint;

					this._requestCerts(payload, metadata).then(this._onCertsReceived.bind(this, payload.fqdn, edge.endpoint)).then(resolve).catch(reject);
				};

				this._selectEdge().then(onEdgeServerSelected.bind(this)).catch(reject);
			}
		);
	}

	//endregion

	//region metadata
	/**
	 *
	 * @param fqdn
	 * @returns {Promise}
	 */
	syncMetadata(fqdn) {

		return new Promise((resolve, reject) => {
				this.getMetadata(fqdn).then(payload => {
//noinspection JSDeprecatedSymbols
					let cred = this.store.getCredential(fqdn);

					if (!cred) {
						reject(`Creds for ${fqdn} not found`);
						return;
					}

					cred.beameStoreServices.writeMetadataSync(payload);
					resolve(payload);

				}).catch(reject);
			}
		);
	}

	/**
	 * @ignore
	 * @param {String} fqdn
	 * @returns {Promise}
	 */
	getMetadata(fqdn) {

		return new Promise((resolve, reject) => {
//noinspection JSDeprecatedSymbols
				let cred = this.store.getCredential(fqdn);

				if (!cred) {
					reject(`Creds for ${fqdn} not found`);
					return;
				}

				const api     = new ProvisionApi(),
				      apiData = ProvisionApi.getApiData(apiEntityActions.GetMetadata.endpoint, {});

				api.setClientCerts(cred.getKey("PRIVATE_KEY"), cred.getKey("P7B"));

				logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.UpdatingMetadata, fqdn);

				api.runRestfulAPI(apiData, (error, metadata) => {
					if (!error) {
						logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.MetadataUpdated, fqdn);
						resolve(metadata);
					}
					else {
						logger.error(`Updating metadata for ${fqdn} failed`, error);
						reject(error);
					}
				}, 'GET');
			}
		);
	}

	/**
	 * Update Entity metadata: name or email
	 * @public
	 * @method Credential.updateMetadata
	 * @param {String} fqdn
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @returns {Promise}
	 */
	updateMetadata(fqdn, name, email) {
		return new Promise((resolve, reject) => {
//noinspection JSDeprecatedSymbols
				let cred = this.store.getCredential(fqdn);

				if (!cred) {
					reject(`Creds for ${fqdn} not found`);
					return;
				}

				const api = new ProvisionApi();

				let postData = {
					    name,
					    email
				    },
				    apiData  = ProvisionApi.getApiData(apiEntityActions.UpdateEntity.endpoint, postData);

				api.setClientCerts(cred.getKey("PRIVATE_KEY"), cred.getKey("P7B"));

				//noinspection ES6ModulesDependencies,NodeModulesDependencies
				api.runRestfulAPI(apiData, (error) => {
					if (error) {
						reject(error);
						return;
					}
					//set signature to consistent call of new credentials
					cred.syncMetadata(fqdn).then(resolve).catch(reject);

				});
			}
		);
	}

	/**
	 * @ignore
	 * @param fqdn
	 * @param edge_fqdn
	 * @returns {Promise}
	 */
	updateEntityEdge(fqdn, edge_fqdn) {
		return new Promise((resolve, reject) => {

				this.store.find(fqdn).then(cred => {

					const api = new ProvisionApi();

					let postData = {
						    edge_fqdn
					    },
					    apiData  = ProvisionApi.getApiData(apiEntityActions.UpdateEntityEdge.endpoint, postData);

					api.setClientCerts(cred.getKey("PRIVATE_KEY"), cred.getKey("P7B"));

					//noinspection ES6ModulesDependencies,NodeModulesDependencies
					api.runRestfulAPI(apiData, (error) => {
						if (error) {
							reject(error);
							return;
						}
						resolve();

					});
				}).catch(reject);


			}
		);
	}

	//endregion

	//region common helpers
	//noinspection JSUnusedGlobalSymbols
	/**
	 * @ignore
	 * @param {String} fqdn
	 * @returns {Promise}
	 */
	subscribeForChildRegistration(fqdn) {
		return new Promise((resolve, reject) => {
//noinspection JSDeprecatedSymbols
				let cred = this.store.getCredential(fqdn);

				if (!cred) {
					reject(`Creds for ${fqdn} not found`);
					return;
				}

				let apiData = ProvisionApi.getApiData(apiEntityActions.SubscribeRegistration.endpoint, {}),
				    api     = new ProvisionApi();

				api.setClientCerts(cred.getKey("PRIVATE_KEY"), cred.getKey("P7B"));

				//noinspection ES6ModulesDependencies,NodeModulesDependencies
				api.runRestfulAPI(apiData, (error) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			}
		);
	}

	// Also used for SNIServer#addFqdn(fqdn, HERE, ...)
	/**
	 * @ignore
	 * @returns {{key: *, cert: *, ca: *}}
	 */
	getHttpsServerOptions() {
		let pk  = this.getKey("PRIVATE_KEY"),
		    p7b = this.getKey("P7B"),
		    ca  = this.getKey("CA");

		if (!pk || !p7b || !ca) {
			throw new Error(`Credential#getHttpsServerOptions: fqdn ${this.fqdn} does not have required fields for running HTTPS server using this credential`);
		}
		return {
			key:  pk,
			cert: p7b,
			ca:   ca
		};
	}

	//endregion

	//region private helpers
	_selectEdge() {

		return new Promise((resolve, reject) => {
				beameUtils.selectBestProxy(config.loadBalancerURL, 100, 1000, (error, payload) => {
					if (!error) {
						resolve(payload);
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
	 * @param {String} fqdn
	 * @param {String} edge_fqdn
	 * @returns {Promise}
	 * @private
	 */
	_onCertsReceived(fqdn, edge_fqdn) {
		const dnsServices = new (require('./DnsServices'))();

		const _updateEntityEdge = () => {
			return this.updateEntityEdge(fqdn, edge_fqdn);
		};

		const _updateEntityMeta = () => {
			return this._syncMetadataOnCertReceived(fqdn);
		};

		return dnsServices.saveDns(fqdn, edge_fqdn)
			.then(_updateEntityEdge.bind(this))
			.then(_updateEntityMeta.bind(this));
	}


	_syncMetadataOnCertReceived(fqdn) {
		return new Promise((resolve, reject) => {
				this.store.find(fqdn, false).then(cred => {
					if (cred == null) {
						reject(`credential for ${fqdn} not found`);
						return;
					}

					const retries = provisionSettings.RetryAttempts + 1,
					      sleep   = 1000;

					const _syncMeta = (retries, sleep) => {

						retries--;

						if (retries == 0) {
							reject(`Metadata of ${fqdn} can't be updated. Please try Later`);
							return;
						}

						cred.syncMetadata(fqdn).then(resolve).catch(() => {
							logger.debug(`retry on sync meta for ${fqdn}`);

							sleep = parseInt(sleep * (Math.random() + 1.5));

							setTimeout(() => {
								_syncMeta(retries, sleep);
							}, sleep);
						});
					};

					_syncMeta(retries, sleep);
				}).catch(reject);
			}
		);
	}

	_createInitialKeyPairs(dirPath) {
		let errMsg;

		return new Promise((resolve, reject) => {

				const _saveKeyPair = (private_key_name, public_key_name, cb) => {
					OpenSSlWrapper.createPrivateKey().then(pk =>
						DirectoryServices.saveFile(dirPath, private_key_name, pk, error => {
							if (!error) {
								let pkFile  = beameUtils.makePath(dirPath, private_key_name),
								    pubFile = beameUtils.makePath(dirPath, public_key_name);
								OpenSSlWrapper.savePublicKey(pkFile, pubFile).then(() => {
									cb(null);
								}).catch(error => {
									cb(error)
								});
							}
							else {
								errMsg = logger.formatErrorMessage("Failed to save Private Key", module_name, {"error": error}, config.MessageCodes.OpenSSLError);
								cb(errMsg);
							}
						})
					).catch(error => {
						cb(error);
					})
				};

				async.parallel([
						cb => {
							_saveKeyPair(config.CertFileNames.PRIVATE_KEY, config.CertFileNames.PUBLIC_KEY, cb);
						},
						cb => {
							_saveKeyPair(config.CertFileNames.BACKUP_PRIVATE_KEY, config.CertFileNames.BACKUP_PUBLIC_KEY, cb);
						}
					],
					error => {
						if (error) {
							logger.error(`generating keys error ${BeameLogger.formatError(error)}`);
							reject(error);
						}

						resolve();
					})

			}
		);
	}

	/**
	 * @param payload
	 * @param metadata
	 * @returns {Promise}
	 */
	_requestCerts(payload, metadata) {
		return new Promise((resolve, reject) => {


				let sign = CommonUtils.parse(payload.sign);

				logger.debug("orderCerts()", payload);

				if (!sign) {
					reject('Invalid authorization token');
					return;
				}

				logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.GettingAuthCreds, payload.parent_fqdn);

				this.store.getNewCredentials(payload.fqdn, payload.parent_fqdn, sign).then(
					cred => {

						logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.AuthCredsReceived, payload.parent_fqdn);
						logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.GeneratingCSR, payload.fqdn);

						let dirPath = cred.getMetadataKey("path");

						cred.createCSR(cred, dirPath).then(csr => {
							logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.CSRCreated, payload.fqdn);

							OpenSSlWrapper.getPublicKeySignature(dirPath, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.PUBLIC_KEY).then(signature => {

								let pubKeys = {
									pub:    DirectoryServices.readFile(beameUtils.makePath(dirPath, config.CertFileNames.PUBLIC_KEY)),
									pub_bk: DirectoryServices.readFile(beameUtils.makePath(dirPath, config.CertFileNames.BACKUP_PUBLIC_KEY)),
									signature
								};

								cred.getCert(csr, sign, pubKeys).then(() => {
									//TODO wait for tests
									// metadata.fqdn        = payload.fqdn;
									// metadata.parent_fqdn = payload.parent_fqdn;
									resolve(metadata);
								}).catch(onError);

							}).catch(onError);


						}).catch(onError);
					}).catch(onError);

				function onError(e) {
					logger.error(BeameLogger.formatError(e), e);
					reject(e);
				}
			}
		);
	}

	/**
	 *
	 * @param error
	 * @param payload
	 * @returns {Promise}
	 * @private
	 */
	_saveCerts(error, payload) {
		let fqdn = this.fqdn;

		return new Promise((resolve, reject) => {
				if (!error) {
					let dirPath           = this.getMetadataKey("path"),
					    directoryServices = this.store.directoryServices;

					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.ReceivedCerts, fqdn);

					directoryServices.saveCerts(dirPath, payload).then(() => {

						async.parallel(
							[
								function (callback) {

									const saveP7B = () => {
										OpenSSlWrapper.createP7BCert(dirPath).then(p7b => {
											directoryServices.saveFileAsync(beameUtils.makePath(dirPath, config.CertFileNames.P7B), p7b, (error, data) => {
												if (!error) {
													callback(null, data)
												}
												else {
													callback(error, null)
												}
											})
										}).catch(function (error) {
											callback(error, null);
										});
									};

									//old api flow
									if (DirectoryServices.doesPathExists(beameUtils.makePath(dirPath, config.CertFileNames.PKCS7))) {
										saveP7B();
									}
									else {
										//hvca flow
										OpenSSlWrapper.createPKCS7Cert(dirPath).then(saveP7B).catch(error => {
											callback(error, null);
										});
									}


								},
								function (callback) {

									OpenSSlWrapper.createPfxCert(dirPath).then(pwd => {
										directoryServices.saveFileAsync(beameUtils.makePath(dirPath, config.CertFileNames.PWD), pwd, (error, data) => {
											if (!error) {
												callback(null, data)
											}
											else {
												callback(error, null)
											}
										})
									}).catch(function (error) {
										callback(error, null);
									});
								}
							],
							(error) => {
								if (error) {
									reject(error);
									return;
								}

								//reload credential
								this.initFromData(fqdn);

								resolve();
							}
						);
					}).catch(reject);
				}
				else {
					reject(error);
				}
			}
		);
	}

	//endregion

	static formatRegisterPostData(metadata) {
		return {
			name:          metadata.name,
			email:         metadata.email,
			parent_fqdn:   metadata.parent_fqdn,
			edge_fqdn:     metadata.edge_fqdn,
			service_name:  metadata.serviceName,
			service_id:    metadata.serviceId,
			matching_fqdn: metadata.matchingFqdn
		};
	}

	//endregion

	checkValidity() {
		return new Promise((resolve, reject) => {
			const validity = this.certData.validity;
			logger.debug('checkValidity: fqdn, start, end', this.fqdn, validity.start, validity.end);
			// validity.end = 0;
			const now = Date.now();
			if (validity.start > now + timeFuzz) {
				reject(new CertificateValidityError(`Certificate ${this.fqdn} is not valid yet`));
				return;
			}
			if (validity.end < now - timeFuzz) {
				reject(new CertificateValidityError(`Certificate ${this.fqdn} has expired`));
				return;
			}
			resolve(this);
		});
	}

	static checkValidityPromiseHelper(cred) {
		return cred.checkValidity();
	}

	//region live credential
	/**
	 * Import remote(non-Beame) credentials and save it to store(x509 + metadata)
	 * @public
	 * @method  Credential.importLiveCredentials
	 * @param {String} fqdn
	 */
	static importLiveCredentials(fqdn) {
		if (!fqdn) {
			throw new Error('importLiveCredentials: fqdn is a required argument');
		}
		const store = new (require("./BeameStoreV2"))();
		let tls     = require('tls');
		try {
			let ciphers           = tls.getCiphers().filter(cipher => {
				return cipher.indexOf('ec') < 0;

			});
			let allowedCiphers    = ciphers.join(':').toUpperCase();
			let conn              = tls.connect(443, fqdn, {host: fqdn, ciphers: allowedCiphers});
			let onSecureConnected = function () {
				//noinspection JSUnresolvedFunction
				let cert = conn.getPeerCertificate(true);
				conn.end();
				let bas64Str    = new Buffer(cert.raw, "hex").toString("base64");
				let certBody    = "-----BEGIN CERTIFICATE-----\r\n";
				certBody += bas64Str.match(/.{1,64}/g).join("\r\n") + "\r\n";
				certBody += "-----END CERTIFICATE-----";
				let credentials = store.addToStore(certBody);
				credentials.saveCredentialsObject();
			};

			conn.on('error', function (error) {
				let msg = error && error.message || error.toString();
				logger.fatal(msg);
			});

			conn.once('secureConnect', onSecureConnected);

		}
		catch (e) {
			logger.fatal(e.toString());
		}

	}

	//endregion
}

Credential.CertificateValidityError = CertificateValidityError;

module.exports = Credential;
