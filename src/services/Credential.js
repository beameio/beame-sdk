//
// Created by Zeev Glozman
// Beame.io Ltd, 2016.
//
/*jshint esversion: 6 */
"use strict";

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
const os      = require('os');
const url     = require('url');

const config                 = require('../../config/Config');
const module_name            = config.AppModules.BeameStore;
const logger_level           = "Credential";
const BeameLogger            = require('../utils/Logger');
const logger                 = new BeameLogger(module_name);
const BeameStoreDataServices = require('../services/BeameStoreDataServices');
const OpenSSlWrapper         = new (require('../utils/OpenSSLWrapper'))();
const utils                  = require('../utils/BeameUtils');
const provisionApi           = new (require('../services/ProvisionApi'))();
const apiEntityActions       = require('../../config/ApiConfig.json').Actions.EntityApi;
const apiAuthServerActions   = require('../../config/ApiConfig.json').Actions.AuthServerApi;

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
		this._store = store;

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
		if (this.hasKey("X509")) {
			pem.config({sync: true});
			pem.readCertificateInfo(this.getKey("X509"), (err, certData) => {
				if (this.fqdn !== certData.commonName) {
					throw new Error(`Credentialing mismatch ${this.metadata} the common name in x509 does not match the metadata`);
				}
				this.certData = err ? null : certData;
			});

			pem.getPublicKey(this.getKey("X509"), (err, publicKey) => {
				this.publicKeyStr     = publicKey.publicKey;
				this.publicKeyNodeRsa = new NodeRsa();
				this.publicKeyNodeRsa.importKey(this.publicKeyStr, "pkcs8-public-pem");
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
				this.certData           = err ? null : certData;
				this.beameStoreServices = new BeameStoreDataServices(certData.commonName, this._store);
				this.metadata.fqdn      = certData.commonName;
				this.fqdn               = certData.commonName;

				this.beameStoreServices.writeObject(config.CertificateFiles.X509, x509);
			}
		});
		pem.getPublicKey(x509, (err, publicKey) => {
			this.publicKeyStr     = publicKey.publicKey;
			this.publicKeyNodeRsa = new NodeRsa();
			this.publicKeyNodeRsa.importKey(this.publicKeyStr, "pkcs8-public-pem");
		});
		this.parseMetadata(metadata);
		this.beameStoreServices.setFolder(this);
		pem.config({sync: false});
	}

	initFromPubKeyDer64(pubKeyDerBase64) {
		this.publicKeyNodeRsa = new NodeRsa();
		this.publicKeyNodeRsa.importKey('-----BEGIN PUBLIC KEY-----\n' + pubKeyDerBase64 + '-----END PUBLIC KEY-----\n', "pkcs8-public-pem");
	}

	//endregion

	//region Save/load services
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
			let filecontent = this.beameStoreServices.readMetadataSync();
			//noinspection es6modulesdependencies,nodemodulesdependencies
			_.map(filecontent, (value, key) => {
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
		return pubKeyLines.slice(1, pubKeyLines.length-1).join('\n');
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
			logger.error(`sign failed with ${utils.formatError(e)}`);
			return null;
		}
	}

	/**
	 *
	 * @param {String} signWithFqdn
	 * @param {String|null} [dataToSign]
	 * @returns {Promise.<SignatureToken|null>}
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

				let authToken = signCred.sign(utils.stringify(dataToSign || Date.now()));

				if (!authToken) {
					reject(`Sign data failure, please see logs`);
					return;
				}

				resolve(authToken);
			}
		);

	}

	encrypt(fqdn, data, signingFqdn) {
		let signingCredential;
		if (signingFqdn) {
			signingCredential = this._store.getCredential(signingFqdn);
		}
		let targetRsaKey = this.getPublicKeyNodeRsa();

		if (!targetRsaKey) {
			throw new Error("encrypt failure, public key not found");
		}


		let sharedCiphered = require('../cli/crypto').aesEncrypt(data);

		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let symmetricCipherElement = JSON.stringify(sharedCiphered[1]);
		sharedCiphered[1]          = "";

		//noinspection ES6ModulesDependencies,NodeModulesDependencies
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

	checkSignature(data, fqdn, signature) {
		let rsaKey = this.getPublicKeyNodeRsa();
		let status = rsaKey.verify(data, signature, "utf8", "base64");
		logger.info(`signing status is ${status} ${fqdn}`);
		return status;
	}

	checkSignatureToken(token) {
		return this.checkSignature(token.signedData, token.signedBy, token.signature);
	}

	decrypt(encryptedMessage) {
		if (encryptedMessage.signature) {
			let signingCredential = this._store.search(encryptedMessage.signedBy)[0];
			if (!signingCredential) {
				new Error("Signing credential is not found in the local store");
			}
			if (!signingCredential.checkSignature(encryptedMessage.signedData, encryptedMessage.signedBy, encryptedMessage.signature)) {
				return null;
			}
			encryptedMessage = encryptedMessage.signedData;
		}


		if (!this.hasKey("PRIVATE_KEY")) {
			logger.fatal(`private key for ${encryptedMessage.encryptedFor}`);
		}
		let rsaKey = this.getPrivateKeyNodeRsa();

		let decryptedMessage = rsaKey.decrypt(encryptedMessage.rsaCipheredKeys);
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let payload          = JSON.parse(decryptedMessage);

		let dechipheredPayload = require('../cli/crypto').aesDecrypt([
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
	 * @param {String|null} [local_ip]
	 */
	createEntityWithLocalCreds(parent_fqdn, name, email, local_ip) {
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

				utils.selectBestProxy(config.loadBalancerURL, 100, 1000, (error, payload) => {
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
						local_ip,
						edge_fqdn: edge.endpoint
					};

					let postData = Credential.formatRegisterPostData(metadata),
					    apiData  = utils.getApiData(apiEntityActions.RegisterEntity.endpoint, postData);

					provisionApi.setClientCerts(parentCred.getKey("PRIVATE_KEY"), parentCred.getKey("X509"));

					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registering, parent_fqdn);

					//noinspection ES6ModulesDependencies,NodeModulesDependencies
					provisionApi.runRestfulAPI(apiData, (error, payload) => {
						if (error) {
							reject(error);
							return;
						}
						//set signature to consistent call of new credentials
						this.signWithFqdn(parent_fqdn, payload.fqdn).then(authToken=> {
							payload.sign = authToken;

							this._requestCerts(payload, metadata).then(resolve).catch(reject);
						}).catch(reject);

					});
				}
			}
		);
	}

	/**
	 *
	 * @param {SignatureToken} authToken
	 * @param {String|null} [authSrvFqdn]
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @param {String|null} [local_ip]
	 */
	createEntityWithAuthServer(authToken, authSrvFqdn, name, email, local_ip) {
		return new Promise((resolve, reject) => {
				var metadata;

				if (!authToken) {
					reject('Auth token required');
					return;
				}

				utils.selectBestProxy(config.loadBalancerURL, 100, 1000, (error, payload) => {
					if (!error) {
						onEdgeServerSelected.call(this, payload);
					}
					else {
						reject(error);
					}
				});


				function onEdgeServerSelected(edge) {

					let authServerFqdn = authSrvFqdn || config.authServerURL;

					metadata = {
						name,
						email,
						local_ip,
						edge_fqdn: edge.endpoint
					};


					provisionApi.postRequest(
						authServerFqdn + apiAuthServerActions.RegisterEntity.endpoint,
						Credential.formatRegisterPostData(metadata),
						fqdnResponseReady.bind(this),
					    utils.isObject(authToken) ? utils.stringify(authToken, false) : authToken
					);
				}

				/**
				 * @param error
				 * @param payload
				 * @this {Credential}
				 */
				function fqdnResponseReady(error, payload) {
					if (error) {
						reject(error);
						return;
					}

					this._requestCerts(payload, metadata).then(resolve).catch(reject);

				}
			}
		);

	}


	createCSR() {
		var errMsg;

		var fqdn       = this.fqdn,
		    dirPath    = this.getMetadataKey("path"),
		    pkFileName = config.CertFileNames.PRIVATE_KEY,
		    store      = this._store;

		return new Promise(function (resolve, reject) {


			OpenSSlWrapper.createPrivateKey().then(pk=> {
				let directoryServices = store.directoryServices;
				directoryServices.saveFile(dirPath, pkFileName, pk, function (error) {
					var pkFile = utils.makePath(dirPath, pkFileName);
					if (!error) {
						OpenSSlWrapper.createCSR(fqdn, pkFile).then(resolve).catch(reject);
					}
					else {
						errMsg = logger.formatErrorMessage("Failed to save Private Key", module_name, {
							"error": error
						}, config.MessageCodes.OpenSSLError);
						reject(errMsg);
					}
				})
			}).catch(function (error) {
				reject(error);
			});


		});
	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 *
	 * @param {String} csr
	 * @param {SignatureToken} authToken
	 */
	getCert(csr, authToken) {
		let fqdn = this.fqdn;


		return new Promise((resolve, reject) => {
				var postData = {
					csr:  csr,
					fqdn: fqdn
				};

				var apiData = utils.getApiData(apiEntityActions.CompleteRegistration.endpoint, postData, true);

				logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.RequestingCerts, fqdn);

				//noinspection ES6ModulesDependencies,NodeModulesDependencies
				provisionApi.runRestfulAPI(apiData, (error, payload) => {
					this._saveCerts(error, payload).then(resolve).catch(reject);
				}, 'POST', JSON.stringify(authToken));
			}
		);
	}

	_requestCerts(payload, metadata) {
		return new Promise((resolve, reject) => {
				this._store.getNewCredentials(payload.fqdn, payload.parent_fqdn, payload.sign).then(
					cred => {
						cred.createCSR().then(
							csr => {
								cred.getCert(csr, payload.sign).then(function () {
									cred.updateMetadata().then(resolve).catch(error=> {
										logger.error(error);
										resolve(metadata);
									})
								}).catch(onError);
							}).catch(onError);
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
										directoryServices.saveFileAsync(utils.makePath(dirPath, config.CertFileNames.P7B), p7b, (error, data) => {
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
										directoryServices.saveFileAsync(utils.makePath(dirPath, config.CertFileNames.PWD), pwd, (error, data) => {
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

	//noinspection JSUnusedGlobalSymbols
	updateMetadata() {
		let fqdn              = this.fqdn,
		    dirPath           = this.getMetadataKey("path");

		return new Promise((resolve, reject) => {
				this.getMetadata(fqdn, dirPath).then(payload => {

					this.beameStoreServices.writeMetadataSync(payload);
					resolve(payload);

				}).catch(reject);
			}
		);
	}

	getMetadata() {
		let dirPath = this.getMetadataKey("path");

		return new Promise((resolve, reject) => {
				provisionApi.setAuthData(utils.getAuthToken(dirPath, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

				var apiData = utils.getApiData(apiEntityActions.GetMetadata.endpoint, {}, false);

				provisionApi.runRestfulAPI(apiData, function (error, metadata) {
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

	static formatRegisterPostData(metadata) {
		return {
			name:        metadata.name,
			email:       metadata.email,
			parent_fqdn: metadata.parent_fqdn,
			edge_fqdn:   metadata.edge_fqdn,
			ip:          metadata.local_ip
		};
	}

	//endregion
}

module.exports = Credential;
