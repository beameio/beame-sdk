//
// Created by Zeev Glozman
// Beame.io Ltd, 2016.

"use strict";

/**
 * S3 public metadata.json structure, should be compliant to backend EntityMetadata Class
 * @typedef {Object} S3Metadata
 * @property {String} level
 * @property {String} fqdn
 * @property {String|null} parent_fqdn
 */


//const exec        = require('child_process').exec;
const config        = require('../../config/Config');
const module_name = config.AppModules.BeameStore;
const logger        = new (require('../utils/Logger'))(module_name);
const provApi       = new (require('./ProvisionApi'))();
const dataservices = new (require('./DirectoryServices'))();
const Credential = require('./Credential');


let _store = null;

class BeameStoreV2 {
	constructor() {
		if(_store === null){
			_store = this;
		}
		else{
			return _store;
		}

		this.credentials = {};
		dataservices.mkdirp(config.localCertsDirV2);
		dataservices.scanDir(config.localCertsDirV2).forEach(folderName => {
			console.log(`credential ${folderName}`)
		 	this.credentials[folderName] = new Credential(folderName, this);
		});
	}

	/**
	 *
	 * @param {String} fqdn
	 * @returns {Credential}
	 */
	search(fqdn) {
		/** @type {Credential} **/
		return this.credentials.fqdn;
	};

	addToStore(x509){};

	getNewCredentials(parentFqdn, challange) {
		if (parentFqdn.isPrivateKeyLocal()) {
			let fqdn       = getHostnameFromProvision(parentFqdn, challange);
			let credential = new Credential(fqdn);
		//
		}
	}; // returns a new Credential object.

	/**
	 * return metadata.json stored in public S3 bucket
	 * @param {String} fqdn
	 * @returns {Promise.<S3Metadata|Object>}
	 */
	getRemoteMetadata(fqdn) {
		var requestPath = config.CertEndpoint + '/' + fqdn + '/' + config.s3MetadataFileName;

		return new Promise(
			(resolve, reject) => {
				provApi.getRequest(requestPath, function (error, data) {
					if (!error) {
						resolve(data);
					}
					else {
						reject(error);
					}
				});
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