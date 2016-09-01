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


var async         = require('async');
//var exec        = require('child_process').exec;
var fs            = require('fs');
var _             = require('underscore');
var os            = require('os');
var config        = require('../../config/Config');
const module_name = config.AppModules.BeameStore;
var logger        = new (require('../utils/Logger'))(module_name);
var jmespath      = require('jmespath');
var beameDirApi   = require('./BeameDirServices');
var sprintf       = require('sprintf');
var mkdirp        = require('mkdirp');
var path          = require('path');
var request       = require('sync-request');
var url           = require('url');
var provApi       = new (require('./ProvisionApi'))();
var dataservices = new (require('./DataServices'))();
var Credential = new (require('./Credential'));

class BeameStoreV2 {
	constructor() {
		this.credentials = [];
		dataservices.mkdirp(config.localCertsDirV2);
		dataservices.scanDir().forEach(folderName => {
			this.credentials.folderName = new Credential(folderName );
		});
	}

	/**
	 *
	 * @param {String} fqdn
	 * @returns {Credential}
	 */
	search(fqdn) {
		/** @type {Credential} **/
		return {};
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