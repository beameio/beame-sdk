//
// Created by Zeev Glozman
// Beame.io Ltd, 2016.

'use strict';

/**
 * S3 public metadata.json structure, should be compliant to backend EntityMetadata Class
 * @typedef {Object} S3Metadata
 * @property {String} level
 * @property {String} fqdn
 * @property {String|null} parent_fqdn
 */


//const exec        = require('child_process').exec;
const config            = require('../../config/Config');
const module_name       = config.AppModules.BeameStore;
const logger            = new (require('../utils/Logger'))(module_name);
const provApi           = new (require('./ProvisionApi'))();
const directoryServices = new (require('./DirectoryServices'))();
const Credential        = require('./Credential');
const _                 = require('underscore');

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
        this.init();
	}

	init(){
		directoryServices.mkdirp(config.localCertsDirV2 + "/");
		directoryServices.scanDir(config.localCertsDirV2 + "/").forEach(fqdn => {
			let credentials = new Credential(this);
			credentials.initFromData(fqdn);
		 	this.addCredential(credentials, fqdn);
				// there is no parent node in the store. still a to decice weather i want to request the whole tree.
				// for now we will keep it at the top level, and as soon as parent is added to the store it will get reassigned
			// just a top level credential or a credential we are placing on top, untill next one is added
		});
	}

	addCredential(credentials){
            let parent_fqdn = credentials.get(config.MetadataProperties.PARENT_FQDN);
            let parentNode = parent_fqdn && this.search(parent_fqdn)[0];
            if(!parent_fqdn || !parentNode){
                this.credentials[credentials.get("FQDN")] = credentials;
                this.reassignCredentials(credentials);
            }
			else {
                //
                // check if credentials has parent fqdn, and if so we are moving it down.
                //
                parentNode.children.push(credentials);
                credentials.parent = parentNode;
                // if it was located on the top level now we need to 0 it would, since we put it in the proper location in the tree.
                if (this.credentials[credentials.get('FQDN')]) {
                    this.credentials[credentials.get('FQDN')]  = null;
                    delete this.credentials[item.get("FQDN")];
                }
                this.reassignCredentials(credentials);
            }
    }

	toJSON(){
		return "huj";
	}

	reassignCredentials(currentNode){
        let fqdnsWithoutParent = Object.keys(this.credentials).filter(fqdn => {
            return this.credentials[fqdn].get('PARENT_FQDN') === currentNode.get('FQDN')
        });
	    let credentialsWitoutParent = fqdnsWithoutParent.map(x => this.credentials[x]);
		credentialsWitoutParent.forEach(item => {
			currentNode.children.push(item);
			this.credentials[item.get("FQDN")] = null;
			delete this.credentials[item.get("FQDN")];
			item.parent = currentNode;
		});
	}

	/**
	 *
	 * @param {String} fqdn
	 * @returns {Credential}
	 */
	search(fqdn, searchArray, fuzzy){
		if(!searchArray){
			searchArray = this.credentials;
		}
		let result = this._search(fqdn, searchArray);

		return [result];
	}
	_search(fqdn, searchArray) {
		//console.log(`starting _search fqdn=${fqdn} sa=`, searchArray);
		for(let item in searchArray){
		//	console.log(`comparing ${searchArray[item].get("FQDN")} ${fqdn}`);
			if(searchArray[item].get("FQDN") === fqdn){
				return searchArray[item];
			}
			if(searchArray[item].children) {
				let result = this._search(fqdn, searchArray[item].children);
				if(!result){
					continue;
				}
	 			return result;
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
		if(!searchArray){
			searchArray = this.credentials;
		}
		let results=[] ;

		for(let item in searchArray){
			//	console.log(`comparing ${searchArray[item].get("FQDN")} ${fqdn}`);
			if(!searchArray[item]) {
				continue;
			}
			if(searchArray[item].get("FQDN").match(regex)){
				results.push(searchArray[item]);
			}
			if(searchArray[item].children) {
				let result = this.list(regex, searchArray[item].children);
				if(!result){
					continue;
				}
				results = results.concat(result);
			}
		}
		return results;
	};


	addToStore(x509){
		let credential = new Credential(this);
		credential.initFromX509(x509);
		this.addCredential(credential);
	};

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
