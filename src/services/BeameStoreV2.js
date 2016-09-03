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
const _ = require('underscore');

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

		dataservices.mkdirp(config.localCertsDirV2 + "/");
		

		
		dataservices.scanDir(config.localCertsDirV2).forEach(folderName => {
			let credentials;

		 	if(this.credentials[folderName]){
				credentials = this.credentials[folderName];
			}else{
				credentials = new Credential(folderName, this);
			}
			let level = credentials.get(config.MetadataProperties.LEVEL);
			let parent_fqdn = credentials.get(config.MetadataProperties.PARENT_FQDN);


			let parentNode = this.search(parent_fqdn)[0];
			console.log(`credential ${folderName } ${parent_fqdn } parent node found ${parentNode !== null}`)
			if(!parent_fqdn || !parentNode){
				this.credentials[folderName] = credentials;
				this.reassignCredentials(credentials);
			} else {
				//
				// check if credentials has parent fqdn, and if so we are moving it down.
				//
				parentNode.childs.push(credentials);
				credentials.father = parentNode;
				// if it was located on the top level now we need to 0 it would, since we put it in the proper location in the tree.
				if (this.credentials[credentials.get('FQDN')]) {
					this.credentials[folderName] = null;
				}
				this.reassignCredentials(credentials);
							}
				// there is no parent node in the store. still a to decice weather i want to request the whole tree.
				// for now we will keep it at the top level, and as soon as parent is added to the store it will get reassigned
			// just a top level credential or a credential we are placing on top, untill next one is added
		});
	}

	reassignCredentials(currentNode){
		console.log(`****************************  reassigning credentials for ${currentNode.get('FQDN')}`);
		let credentialsWitoutParent = _.filter(this.credentials, (_item) => {
			console.log(`${_item.get('PARENT_FQDN')} === ${currentNode.get('FQDN')}`)
			return _item.get('PARENT_FQDN') === currentNode.get('FQDN');
		});
		console.log(`**************************** found records to reassign ${credentialsWitoutParent.length}`);
		if(credentialsWitoutParent.length > 0)
			console.log('here');
		_.each(credentialsWitoutParent, (item, index) => {
			currentNode.childs.push(item);
			this.credentials[item.get("FQDN")] = null;
			delete this.credentials[item.get("FQDN")];
			item.father = currentNode;
		});
		console.log(`****************************  ENDED reassigning credentials for ${currentNode.get('FQDN')} ${Object.keys(this.credentials).length}`);
	}

	/**
	 *
	 * @param {String} fqdn
	 * @returns {Credential}
	 */
	search(fqdn, searchArray){
		if(!searchArray){
			searchArray = this.credentials;
		}
		let result = this._search(fqdn, searchArray);

		return [result];
	}
	_search(fqdn, searchArray) {
		console.log(`searching for fqdn ${fqdn}`);
		//console.log(`starting _search ${fqdn}`);
		if(!searchArray){
			searchArray = this.credentials;
		}
		for(let item in searchArray){
		//	console.log(`comparing ${searchArray[item].get("FQDN")} ${fqdn}`);
			if(!searchArray[item]) {
				continue;
			}
			console.log(`COMPARING ${searchArray[item].get("FQDN")} ${fqdn}`);
			if(searchArray[item].get("FQDN") === fqdn){
				return searchArray[item];
			}
			if(searchArray[item].childs) {
				let result = this._search(fqdn, searchArray[item].childs);
				if(!result){
					continue;
				}
	 			return result;
			}
		};
		return null;
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
