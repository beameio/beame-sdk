//
// Created by Zeev Glozman
// Beame.io Ltd, 2016.
//
/*jshint esversion: 6 */
"use strict";

/**
 * @typedef {Object} SignedData
 * @property {Number} created_at
 * @property {Number} valid_till
 * @property {Object|String|null} data
 */

/**
 * signature token structure , used as AuthorizationToken in Provision
 * @typedef {Object} SignatureToken
 * @property {String} signedData
 * @property {String} signedBy
 * @property {String} signature
 */
const pem     = require('pem');
const NodeRsa = require("node-rsa");
const async   = require('async');
const _       = require('underscore');
const url     = require('url');

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

/**
 * You should never initiate this class directly, but rather always access it through the beameStore.
 * @class {Object} Credential
 *
 */
class Credential {

	/**
	 *
	 *
	 */
	constructor(store) {
		if (store) {
			this._store = store;
		}

		this.metadata = {};
		this.children = [];
	}

	//region Init functions
	initWithFqdn(fqdn, metadata) {
		this.fqdn               = fqdn;
		this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this._store, this.parseMetadata(metadata));
		this.parseMetadata(metadata);
		this.beameStoreServices.setFolder(this);
	}

	initFromData(fqdn) {
		this.fqdn               = fqdn;
		this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this._store);
		this.loadCredentialsObject();
		this.initCryptoKeys();
	}

	initCryptoKeys() {
		if (this.hasKey("X509")) {
			pem.config({sync: true});
			pem.readCertificateInfo(this.getKey("X509") + "", (err, certData) => {
				if (this.fqdn && this.fqdn !== certData.commonName) {
					throw new Error(`Credentialing mismatch ${this.metadata} the common name in x509 does not match the metadata`);
				}
				this.certData           = err ? null : certData;
				this.fqdn               = this.extractCommonName();
				this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this._store);
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

	initFromX509(x509, metadata) {
		pem.config({sync: true});
		pem.readCertificateInfo(x509, (err, certData) => {
			if (!err) {
				this.certData           = certData;
				this.beameStoreServices = new BeameStoreDataServices(certData.commonName, this._store);
				this.metadata.fqdn      = certData.commonName;
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

	initFromPubKeyDer64(pubKeyDerBase64) {
		this.publicKeyNodeRsa = new NodeRsa();
		this.publicKeyNodeRsa.importKey('-----BEGIN PUBLIC KEY-----\n' + pubKeyDerBase64 + '-----END PUBLIC KEY-----\n', "pkcs8-public-pem");
	}

	//endregion

	//region Save/load services

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
			if (config.MetadataProperties.hasOwnProperty(key) && importCred.metadata.hasOwnProperty(key)) {
				this.metadata[config.MetadataProperties[key]] = new Buffer(importCred[config.MetadataProperties[key]]).toString('utf8');
			}
		}
		this.initCryptoKeys();
		this.beameStoreServices.setFolder(this);
	}

	shred(callback) {
		this.beameStoreServices.deleteDir(callback);
	}

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

	loadCredentialsObject() {
		Object.keys(config.CertificateFiles).forEach(keyName => {
			try {
				this[keyName] = this.beameStoreServices.readObject(config.CertFileNames[keyName]);
			} catch (e) {
				console.log(`exception ${e}`);
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
	 *
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
	 *
	 * @param {String} signWithFqdn
	 * @param {String|null} [dataToSign]
	 * @returns {Promise.<String|null>}
	 */
	signWithFqdn(signWithFqdn, dataToSign) {
		return new Promise((resolve, reject) => {
				if (!signWithFqdn) {
					reject('SignedWith FQDN parameter required');
					return;
				}

				var signCred = this._store.getCredential(signWithFqdn);

				if (!signCred) {
					reject(`Credential ${signWithFqdn} not found in store`);
					return;
				}

				if (!signCred.hasKey("PRIVATE_KEY")) {
					reject(`Credential ${signWithFqdn} hasn't private key for signing`);
					return;
				}
				const AuthToken = require('./AuthToken');

				let authToken = AuthToken.create(dataToSign || Date.now(), signCred, 60 * 5);

				if (!authToken) {
					reject(`Sign data failure, please see logs`);
					return;
				}

				resolve(authToken);
			}
		);

	}

	/**
	 *
	 * @param {SignatureToken} token
	 * @returns {*}
	 */
	checkSignatureToken(token) {
		let rsaKey = this.getPublicKeyNodeRsa();
		let status = rsaKey.verify(token.signedData, token.signature, "utf8", "base64");
		if (status) {
			logger.info(`signature signed by  ${token.signedBy} verified successfully`);
		}
		else {
			logger.warn(`invalid signature signed by ${token.signedBy}`);
		}

		return status;
	}

	/**
	 *
	 * @param {String} fqdn
	 * @param {String} data
	 * @param {String} signingFqdn
	 * @returns {EncryptedMessage}
	 */
	encrypt(fqdn, data, signingFqdn) {
		let signingCredential;
		if (signingFqdn) {
			signingCredential = this._store.getCredential(signingFqdn);
		}
		let targetRsaKey = this.getPublicKeyNodeRsa();

		if (!targetRsaKey) {
			throw new Error("encrypt failure, public key not found");
		}

		let sharedCiphered = CryptoServices.aesEncrypt(data);

		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let symmetricCipherElement = JSON.stringify(sharedCiphered[1]);
		sharedCiphered[1]          = "";

		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		/** @type {EncryptedMessage} */
		let encryptedUnsignedMessage = {
			rsaCipheredKeys: targetRsaKey.encrypt(symmetricCipherElement, "base64", "utf8"),
			data:            sharedCiphered[0],
			encryptedFor:    fqdn
		};
		if (signingCredential) {
			return signingCredential.sign(encryptedUnsignedMessage);
		}

		return encryptedUnsignedMessage;
	}

	/**
	 *
	 * @param {Object} encryptedMessage
	 * @returns {*}
	 */
	decrypt(encryptedMessage) {
		if (encryptedMessage.signature) {
			let signingCredential = this._store.getCredential(encryptedMessage.signedBy);
			if (!signingCredential) {
				new Error("Signing credential is not found in the local store");
			}
			if (!signingCredential.checkSignatureToken({
					signedData: encryptedMessage.signedData,
					signedBy:   encryptedMessage.signedBy,
					signature:  encryptedMessage.signature
				})) {
				return null;
			}
			encryptedMessage = encryptedMessage.signedData;
		}


		if (!this.hasKey("PRIVATE_KEY")) {
			logger.fatal(`private key for ${encryptedMessage.encryptedFor} not found`);
		}
		let rsaKey = this.getPrivateKeyNodeRsa();

		let decryptedMessage = rsaKey.decrypt(encryptedMessage.rsaCipheredKeys);
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let payload          = JSON.parse(decryptedMessage);

		let dechipheredPayload = CryptoServices.aesDecrypt([
			encryptedMessage.data,
			payload,
		]);
		if (!dechipheredPayload) {
			logger.fatal("Decrypting, No message");
		}
		return dechipheredPayload;
	}

	//endregion

	//region Entity manage
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

				var parentCred = this._store.getCredential(parent_fqdn);

				if (!parentCred) {
					reject(`Parent credential ${parent_fqdn} not found`);
					return;
				}

				beameUtils.selectBestProxy(config.loadBalancerURL, 100, 1000, (error, payload) => {
					if (!error) {
						onEdgeServerSelected.call(this, payload);
					}
					else {
						reject(error);
					}
				});

				var metadata;

				function onEdgeServerSelected(edge) {

					metadata = {
						parent_fqdn,
						name,
						email,
						edge_fqdn: edge.endpoint
					};

					let postData = Credential.formatRegisterPostData(metadata),
					    apiData  = ProvisionApi.getApiData(apiEntityActions.RegisterEntity.endpoint, postData),
					    api      = new ProvisionApi();

					api.setClientCerts(parentCred.getKey("PRIVATE_KEY"), parentCred.getKey("X509"));

					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registering, parent_fqdn);

					//noinspection ES6ModulesDependencies,NodeModulesDependencies
					api.runRestfulAPI(apiData, (error, payload) => {
						if (error) {
							reject(error);
							return;
						}
						//set signature to consistent call of new credentials
						this.signWithFqdn(parent_fqdn, payload).then(authToken=> {
							payload.sign = authToken;

							this._requestCerts(payload, metadata).then(this._onCertsReceived.bind(this, payload.fqdn)).then(resolve);
						}).catch(reject);

					});
				}
			}
		);
	}

	/**
	 *
	 * @param {String} authToken
	 * @param {String|null} [authSrvFqdn]
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 */
	createEntityWithAuthServer(authToken, authSrvFqdn, name, email) {
		return new Promise((resolve, reject) => {
				var metadata;

				if (!authToken) {
					reject('Auth token required');
					return;
				}

				logger.debug("createEntityWithAuthServer(): Selecting proxy");

				beameUtils.selectBestProxy(config.loadBalancerURL, 100, 1000, (error, payload) => {
					if (!error) {
						onEdgeServerSelected.call(this, payload);
					}
					else {
						reject(error);
					}
				});


				function onEdgeServerSelected(edge) {

					logger.debug("createEntityWithAuthServer(): onEdgeServerSelected");
					let authServerFqdn = (authSrvFqdn && 'https://' + authSrvFqdn) || config.authServerURL;

					metadata = {
						name,
						email,
						edge_fqdn: edge.endpoint
					};
					let api  = new ProvisionApi();

					api.postRequest(
						authServerFqdn + apiAuthServerActions.RegisterEntity.endpoint,
						Credential.formatRegisterPostData(metadata),
						fqdnResponseReady.bind(this),
						authToken,
						5
					);
				}

				/**
				 * @param error
				 * @param payload
				 * @this {Credential}
				 */
				function fqdnResponseReady(error, payload) {
					logger.debug("createEntityWithAuthServer(): fqdnResponseReady");
					if (error) {
						reject(error);
						return;
					}

					this._requestCerts(payload, metadata).then(this._onCertsReceived.bind(this, payload.fqdn)).then(resolve);
				}
			}
		);

	}

	/**
	 *
	 * @param {String} authToken
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @returns {Promise}
	 */
	createEntityWithAuthToken(authToken, name, email) {
		return new Promise((resolve, reject) => {
				var metadata;

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

				beameUtils.selectBestProxy(config.loadBalancerURL, 100, 1000, (error, payload) => {
					if (!error) {
						onEdgeServerSelected.call(this, payload);
					}
					else {
						reject(error);
					}
				});


				function onEdgeServerSelected(edge) {

					metadata = {
						name,
						email,
						parent_fqdn: tokenObj.signedBy,
						edge_fqdn:   edge.endpoint,
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
				}

				/**
				 * @param error
				 * @param payload
				 * @this {Credential}
				 */
				function fqdnResponseReady(error, payload) {
					logger.debug("createEntityWithAuthServer(): fqdnResponseReady");
					if (error) {
						reject(error);
						return;
					}
					this.signWithFqdn(metadata.parent_fqdn, CommonUtils.generateDigest(payload)).then(authToken=> {
						payload.sign = authToken;

						this._requestCerts(payload, metadata).then(this._onCertsReceived.bind(this, payload.fqdn)).then(resolve);
					}).catch(reject);

				}
			}
		);

	}

	_onCertsReceived(fqdn) {
		return new Promise((resolve, reject) => {
				let cred = this._store.getCredential(fqdn);

				if (cred == null) {
					reject(`credential for ${fqdn} not found`);
					return;
				}

				cred._syncMetadata(fqdn).then(resolve);
			}
		);
	}

	createCSR() {
		var errMsg;

		var fqdn       = this.fqdn,
		    dirPath    = this.getMetadataKey("path"),
		    pkFileName = config.CertFileNames.PRIVATE_KEY;

		return new Promise(function (resolve, reject) {


			OpenSSlWrapper.createPrivateKey().then(pk=> {
				DirectoryServices.saveFile(dirPath, pkFileName, pk, error => {
					if (!error) {
						let pkFile = beameUtils.makePath(dirPath, pkFileName);
						OpenSSlWrapper.createCSR(fqdn, pkFile).then(resolve).catch(reject);
					}
					else {
						errMsg = logger.formatErrorMessage("Failed to save Private Key", module_name, {"error": error}, config.MessageCodes.OpenSSLError);
						reject(errMsg);
					}
				})
			}).catch(function (error) {
				reject(error);
			});


		});
	}

	/**
	 *
	 * @param {String} csr
	 * @param {SignatureToken} authToken
	 */
	getCert(csr, authToken) {
		let fqdn = this.fqdn;


		return new Promise((resolve, reject) => {
				let postData = {
					    csr:  csr,
					    fqdn: fqdn
				    },
				    api      = new ProvisionApi(),
				    apiData  = ProvisionApi.getApiData(apiEntityActions.CompleteRegistration.endpoint, postData, true);

				logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.RequestingCerts, fqdn);

				//noinspection ES6ModulesDependencies,NodeModulesDependencies
				api.runRestfulAPI(apiData, (error, payload) => {
					this._saveCerts(error, payload).then(resolve).catch(reject);
				}, 'POST', JSON.stringify(authToken));
			}
		);
	}

	/**
	 *
	 * @param {String} fqdn
	 * @returns {Promise}
	 */
	getMetadata(fqdn) {

		return new Promise((resolve, reject) => {

				var cred = this._store.getCredential(fqdn);

				if (!cred) {
					reject(`Creds for ${fqdn} not found`);
					return;
				}

				var api     = new ProvisionApi(),
				    apiData = ProvisionApi.getApiData(apiEntityActions.GetMetadata.endpoint, {}, false);

				api.setClientCerts(cred.getKey("PRIVATE_KEY"), cred.getKey("X509"));

				logger.debug(`requesting metadata for ${fqdn}`);

				api.runRestfulAPI(apiData, (error, metadata) => {
					if (!error) {
						resolve(metadata);
					}
					else {
						reject(error);
					}
				}, 'GET');
			}
		);
	}

	updateMetadata(fqdn, name, email) {
		return new Promise((resolve, reject) => {

				let cred = this._store.getCredential(fqdn);

				if (!cred) {
					reject(`Creds for ${fqdn} not found`);
					return;
				}

				var api = new ProvisionApi();

				let postData = {
					    name,
					    email
				    },
				    apiData  = ProvisionApi.getApiData(apiEntityActions.UpdateEntity.endpoint, postData);

				api.setClientCerts(cred.getKey("PRIVATE_KEY"), cred.getKey("X509"));

				//noinspection ES6ModulesDependencies,NodeModulesDependencies
				api.runRestfulAPI(apiData, (error) => {
					if (error) {
						reject(error);
						return;
					}
					//set signature to consistent call of new credentials
					cred._syncMetadata(fqdn).then(resolve).catch(reject);

				});
			}
		);
	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 *
	 * @param {String} fqdn
	 * @returns {Promise}
	 */
	subscribeForChildRegistration(fqdn) {
		return new Promise((resolve, reject) => {

				var cred = this._store.getCredential(fqdn);

				if (!cred) {
					reject(`Creds for ${fqdn} not found`);
					return;
				}

				let apiData = ProvisionApi.getApiData(apiEntityActions.SubscribeRegistration.endpoint, {}),
				    api     = new ProvisionApi();

				api.setClientCerts(cred.getKey("PRIVATE_KEY"), cred.getKey("X509"));

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

	_requestCerts(payload, metadata) {
		return new Promise((resolve, reject) => {


				var sign = CommonUtils.parse(payload.sign);

				logger.debug("_requestCerts()", sign);

				if (!sign) {
					reject('Invalid authorization token');
					return;
				}

				this._store.getNewCredentials(payload.fqdn, payload.parent_fqdn, sign).then(
					cred => {
						cred.createCSR().then(
							csr => {
								cred.getCert(csr, sign).then(() => {
									metadata.fqdn        = payload.fqdn;
									metadata.parent_fqdn = payload.parent_fqdn;
									resolve(metadata);
								});
							});
					}).catch(onError);

				function onError(e) {
					reject(e);
				}
			}
		);
	}

	_saveCerts(error, payload) {
		let fqdn = this.fqdn;

		return new Promise((resolve, reject) => {
				if (!error) {
					let dirPath           = this.getMetadataKey("path"),
					    directoryServices = this._store.directoryServices;

					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.ReceivedCerts, fqdn);

					directoryServices.saveCerts(dirPath, payload).then(() => {

						async.parallel(
							[
								function (callback) {

									OpenSSlWrapper.createP7BCert(dirPath).then(p7b=> {
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

								},
								function (callback) {

									OpenSSlWrapper.createPfxCert(dirPath).then(pwd=> {
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

	/**
	 *
	 * @param fqdn
	 * @returns {Promise}
	 * @private
	 */
	_syncMetadata(fqdn) {

		return new Promise((resolve, reject) => {
				this.getMetadata(fqdn).then(payload => {

					let cred = this._store.getCredential(fqdn);

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


	static formatRegisterPostData(metadata) {
		return {
			name:        metadata.name,
			email:       metadata.email,
			parent_fqdn: metadata.parent_fqdn,
			edge_fqdn:   metadata.edge_fqdn
		};
	}

	//endregion
}

module.exports = Credential;
