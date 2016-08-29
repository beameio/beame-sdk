//
// Created by Zeev Glozman 
// Beame.io Ltd, 2016.
//

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


class BeameStoreV2 {
	constructor(){
	
	
	}
	search(fqdn); // returns credential objects
	
	addToStore(x509);
:
	getNewCredentials(parentFqdn, challange ){
		if(parentFqdn.isPrivateKeyLocal()){
			let fqdn  = getHostnameFromProvision(parentFqdn, challange);
			let credential = new Credential(fqdn);
		

			//
		}

	}; // returns a new Credential object.



	if (beameStoreInstance) {
		return beameStoreInstance;
	}

	this.ensureFreshBeameStore();

	beameStoreInstance = this;
}

class BeameStoreHealper{
	constructor(fqdn){
		// init store 
		//
		this.fqdn = fqdn;
		this.dir = makepath(config.localCertsDir, fqdn);
		mkdirp.sync(this.dir);

	}
	
	readObject(key);
	writeObject(data,  key);
	
}
