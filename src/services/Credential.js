//
// Created by Zeev Glozman
// Beame.io Ltd, 2016.
//
/*jshint esversion: 6 */
"use strict";

const  async                  = require('async');
const  _                      = require('underscore');
const  os                     = require('os');
const  config                 = require('../../config/Config');
const  module_name            = config.AppModules.BeameStore;
const  logger                 = new (require('../utils/Logger'))(module_name);
const  url                    = require('url');
const  BeameStoreDataServices = require('../services/BeameStoreDataServices');
const  pem 					  = require('pem');
const  NodeRsa 				  = require("node-rsa");

/**
 * You should never initiate this class directly, but rather always access it through the beameStore.
 * @class {Object} Credential
 *
 */
class Credential {

	/**
	 *
	 * @param {String|null} [fqdn]
	 * @param {String|null} [parent_fqdn]
	 * @param {Array.<SecurityPolicy>} [policies]
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @param {String|null} [local_ip]
	 */
	constructor(store) {
		this._store = store;
		this.metadata = {};
		this.children = [];
	}

	initFromData(fqdn) {
		this.fqdn = fqdn;
		this.beameStoreServices = new BeameStoreDataServices(this.fqdn, this._store);
		this.loadCredentialsObject();
		if (this.hasX509()) {
			pem.config({sync: true});
			pem.readCertificateInfo(this.X509, (err, certData) => {
				console.log(`read cert ${certData.commonName}`)
				if ((this.fqdn || this.get('FQDN')) !== certData.commonName) {
					new Error(`Credentialing missmath ${this.metadata} the commonname in x509 does not match the metadata`);
				}
				this.certData = certData ? certData : err;
			});

			pem.getPublicKey(this.X509, (err, publicKey) => {
				this.publicKeyStr = publicKey.publicKey;
				this.publicKeyNodeRsa = new NodeRsa();
				this.publicKeyNodeRsa.importKey(this.publicKeyStr, "pkcs8-public-pem");
			});
			pem.config({sync: false});
		}
		if (this.hasPrivateKey()) {
			this.privateKeyNodeRsa = new NodeRsa();
			this.privateKeyNodeRsa.importKey(this.PRIVATE_KEY + " ", "private");
		}
	}


	initFromX509(x509) {
		pem.readCertificateInfo(x509, (err, certData) => {
			if (!err) {
				this.certData = certData ? certData : err;
				this.beameStoreServices = new BeameStoreDataServices(certData.commonName, this._store);
				this.metadata.fqdn = certData.commonName;
				this.fqdn = certData.commonName
				this.beameStoreServices.writeObject(config.CertificateFiles.X509, data);
			}
		});
	}

	toJSON() {
		let ret = {metadata: {}};

		for (let key in config.CertFileNames) {
			ret[key] = this[key];
		}
		;

		for (let key in config.MetadataProperties) {
			ret.metadata[config.MetadataProperties[key]] = this.metadata[config.MetadataProperties[key]];
		}
		;
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
		if (this.hasX509()) {
			this.state = this.state | config.CredentialStatus.CERT;
		}

		if (this.state & config.CredentialStatus.CERT && this.extractCommonName().indexOf("beameio.net")) {
			this.state = this.state | config.CredentialStatus.BEAME_ISSUED_CERT;
			this.state = this.state & config.CredentialStatus.NON_BEAME_CERT;
		} else {

			this.state = this.state | config.CredentialStatus.BEAME_ISSUED_CERT;
			this.state = this.state & config.CredentialStatus.NON_BEAME_CERT;
		}

		if (this.hasPrivateKey()) {
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

	hasPrivateKey() {
		return this.PRIVATE_KEY ? true : false;
	}

	hasPublicKey() {
		return this.publicKeyNodeRsa ? true : false;
	}

	hasX509() {
		if (this.X509) {
			return true;
		}
		else {
			return false;
		}
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

	sign(data) {
		if (this.hasPrivateKey()) {
			var message = {
				signedData: {
					data: data,
					signedby: this.fqdn,
				}
			}
		}
		//noinspection ES6ModulesDependencies,NodeModulesDependencies,JSCheckFunctionSignatures
		message.signature = JSON.stringify(crypto.sign(message.signedData, fqdn));
		return this.privateKeyNodeRsa.sign(data, "base64", "utf8");
	}

	encrypt(fqdn, data, signingFqdn){
		let signingCredential;
		if(signingFqdn) {
			signingCredential = this._store.search(signingFqdn)[0];
		}
		let targetRsaKey = this.getPublicKeyNodeRsa();


		if (targetRsaKey) {
			let sharedCiphered = require('../cli/crypto').aesEncrypt(data);

			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			let symmetricCipherElement = JSON.stringify(sharedCiphered[1]);
			sharedCiphered[1] = "";

			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			let messageToSign = {
				rsaCipheredKeys: targetRsaKey.encrypt(symmetricCipherElement, "base64", "utf8"),
				data: sharedCiphered[0],
				encryptedFor: fqdn
			};
			if(signingCredential){
				return signingCredential.sign(messageToSign);
			}

			return messageToSign;
		}
		logger.error("encrypt failure, public key not found");
		return null;
	}

	decrypt(message){
		if (!credential.hasPrivateKey()) {
			logger.fatal(`private key for ${encryptedMessage.encryptedFor}`);
		}
		let rsaKey = this.getPrivateKeyNodeRsa();

		let decryptedMessage = rsaKey.decrypt(encryptedMessage.rsaCipheredKeys) + " ";
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		let payload = JSON.parse(JSON.parse(decryptedMessage));

		let dechipheredPayload = aesDecrypt([
			encryptedMessage.data,
			payload,
		]);
		if (!message) {
			logger.fatal("Decrypting, No message");
		}
		return message;
	}
}
module.exports = Credential;
