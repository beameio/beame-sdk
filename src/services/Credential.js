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

const async                  = require('async');
const _                      = require('underscore');
const os                     = require('os');
const config                 = require('../../config/Config');
const module_name            = config.AppModules.BeameStore;
const logger                 = new (require('../utils/Logger'))(module_name);
const url                    = require('url');
const BeameStoreDataServices = require('../services/BeameStoreDataServices');
const pem                    = require('pem');
const NodeRsa                = require("node-rsa");
const OpenSSlWrapper         = new (require('../utils/OpenSSLWrapper'))();
const utils                  = require('../utils/BeameUtils');
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
		this._store             = store;

		this.metadata           = {};
		this.children           = [];
	}

    initWithFqdn(fqdn){
        this.fqdn               = fqdn;
        this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this._store);
    }

	initFromData(fqdn) {
		this.fqdn               = fqdn;
		this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this._store);
		this.loadCredentialsObject();
		if (this.hasKey("X509")) {
			pem.config({sync: true});
			pem.readCertificateInfo(this.X509, (err, certData) => {
				console.log(`read cert ${certData.commonName}`);
				if ((this.fqdn || this.get('FQDN')) !== certData.commonName) {
					new Error(`Credentialing missmath ${this.metadata} the commonname in x509 does not match the metadata`);
				}
				this.certData = certData ? certData : err;
			});

			pem.getPublicKey(this.X509, (err, publicKey) => {
				this.publicKeyStr     = publicKey.publicKey;
				this.publicKeyNodeRsa = new NodeRsa();
				this.publicKeyNodeRsa.importKey(this.publicKeyStr, "pkcs8-public-pem");
			});
			pem.config({sync: false});
		}
		if (this.hasKey("PRIVATE_KEY")) {
			this.privateKeyNodeRsa = new NodeRsa();
			this.privateKeyNodeRsa.importKey(this.PRIVATE_KEY + " ", "private");
		}
	}


	initFromX509(x509, metadata) {
		pem.config({sync: true});
		pem.readCertificateInfo(x509, (err, certData) => {
			if (!err) {
				this.certData           = certData ? certData : err;
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
        if(metadata){
            _.map(metadata, (value, key) => {
                this.metadata[key] = value;
            });
        }
		pem.config({sync: false});
	}

	toJSON() {
		let ret = {
			metadata: {}
		};

		for (let key in config.CertFileNames) {
			ret[key] = this[key];
		}

		for (let key in config.MetadataProperties) {
			ret.metadata[config.MetadataProperties[key]] = this.metadata[config.MetadataProperties[key]];
		}

		return ret;
	}

	get(field) {
		return this.metadata[field.toLowerCase()];
	}

	determineCertStatus() {
		if (this.dirShaStatus && this.dirShaStatus.length !== 0) {
			//
			// This means this is a brand new object and we dont know anything at all
			this.credentials = this.readCertificateDir();

		}
		if (this.hasKey("X509")) {
			this.state = this.state | config.CredentialStatus.CERT;
		}

		if (this.state & config.CredentialStatus.CERT && this.extractCommonName().indexOf("beameio.net")) {
			this.state = this.state | config.CredentialStatus.BEAME_ISSUED_CERT;
			this.state = this.state & config.CredentialStatus.NON_BEAME_CERT;
		} else {

			this.state = this.state | config.CredentialStatus.BEAME_ISSUED_CERT;
			this.state = this.state & config.CredentialStatus.NON_BEAME_CERT;
		}

		if (this.hasKey("PRIVATE_KEY")) {
			this.state = this.state & config.CredentialStatus.PRIVATE_KEY;
		} else {
			this.state = this.state | config.CredentialStatus.PRIVATE_KEY;
		}
	}

	getCredentialStatus() {
		return this.status;
	}


	getFqdnName() {

	}

	getMetadata() {

	}


	loadCredentialsObject() {
		this.state = this.state | config.CredentialStatus.DIR_NOTREAD;

		Object.keys(config.CertificateFiles).forEach((keyName, index) => {
			try {
				this[keyName] = this.beameStoreServices.readObject(config.CertFileNames[keyName]);
			} catch (e) {
				console.log(`exception ${e}`);
			}
		});

//		credentials.path = certificatesDir;

		try {
			let filecontent = this.beameStoreServices.readMetadataSync();
			//noinspection es6modulesdependencies,nodemodulesdependencies
			_.map(filecontent, (value, key) => {
				this.metadata[key] = value;
			});
		} catch (e) {
			logger.debug("readcertdata error " + e.tostring());
		}
	}


	hasKey(key){
		return this.hasOwnProperty(key) && !_.isEmpty(this[key])
	}

	extractCommonName() {
		return certData.commonName;
	}

	getPublicKeyNodeRsa() {
		return this.publicKeyNodeRsa;
	}

	getPrivateKeyNodeRsa() {
		return this.privateKeyNodeRsa;
	}

	extractAltNames() {

	}

	getCertificateMetadata() {
		return this.certData;
	}

	getPublicKey() {
		return publicKey;
	}

	/**
	 *
	 * @param {String|Object} data
	 * @returns {SignatureToken}
	 */
	sign(data) {

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
	}

	encrypt(fqdn, data, signingFqdn) {
		let signingCredential;
		if (signingFqdn) {
			signingCredential = this._store.search(signingFqdn)[0];
		}
		let targetRsaKey = this.getPublicKeyNodeRsa();


		if (targetRsaKey) {
			let sharedCiphered = require('../cli/crypto').aesEncrypt(data);

			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			let symmetricCipherElement = JSON.stringify(sharedCiphered[1]);
			sharedCiphered[1]          = "";

			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			let messageToSign = {
				rsaCipheredKeys: targetRsaKey.encrypt(symmetricCipherElement, "base64", "utf8"),
				data:            sharedCiphered[0],
				encryptedFor:    fqdn
			};
			if (signingCredential) {
				return signingCredential.sign(messageToSign);
			}

			return messageToSign;
		}
		logger.error("encrypt failure, public key not found");
		return null;
	}

	checkSignature(data, fqdn, signature) {
		let rsaKey = this.getPublicKeyNodeRsa();
		let status = rsaKey.verify(data, signature, "utf8", "base64");
		logger.info(`signing status is ${status} ${fqdn}`);
		return status;
	}

    checkSignatureToken(token) {
        return this.checkSignature(token.signedData, token.signedBy, token.signature)
    }

	decrypt(encryptedMessage) {
		console.log("In credentials decrypt");
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
		var msr              = JSON.stringify(decryptedMessage);
		console.log('decryptedMessage ${ msr }');
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let payload = JSON.parse(decryptedMessage);

		let dechipheredPayload = require('../cli/crypto').aesDecrypt([
			encryptedMessage.data,
			payload,
		]);
		if (!dechipheredPayload) {
			logger.fatal("Decrypting, No message");
		}
		return dechipheredPayload;
	}

	createCSR(dirPath, fqdn, pkName) {
		var self = this;
		var errMsg;

		var sslWrapper = OpenSSlWrapper;

		return new Promise(function (resolve, reject) {

			var pkFileName = pkName || config.CertFileNames.PRIVATE_KEY;

			sslWrapper.createPrivateKey().then(pk=> {
				let directoryServices = new (require('./DirectoryServices'))();
				directoryServices.saveFile(dirPath, pkFileName, pk, function (error) {
					var pkFile = utils.makePath(dirPath, pkFileName);
					if (!error) {
						sslWrapper.createCSR(fqdn, pkFile).then(resolve).catch(reject);
					}
					else {
						errMsg = logger.formatErrorMessage("Failed to save Private Key", module_name, {
							"error":  error,
							"stderr": stderr
						}, config.MessageCodes.OpenSSLError);
						reject(errMsg);
					}
				})
			}).catch(function (error) {
				reject(error);
			});


		});
	}
}
module.exports = Credential;
