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


function Credential(fqdn){
	this.fqdn = fqdn;
 	this.state = ;
	this state = config.CREDENTIAL_STATUS.DIR_NOTREAD;
	this.dirShaStatus = "";

	determineCertStatus();
}


//
// this function will scan the beamedis of the this.fqdn this is not intended to be used directly.
//

Credential.prototype.determineCertStatus = function(){
		this.certDir = makepath(config.localCertsDir, fqdn);


		if(dirShaStatus && dirShaStatu.lenght !== 0){
			//
			// This means this is a brand new object and we dont know anything at all 
			this.credentials = this.readCertificateDir();
		
		}
		if(this.doesHaveX509()){
			this.state = this.state & config.CREDENTIAL_STATUS.CERT;
		}
		
		if(this.state & config.CREDENTIAL_STATUS.CERT && this.extractCommonName().indexOf("beameio.net")){
			this.state = this.state & config.CREDENTIAL_STATUS.BEAME_ISSUED_CERT;
			this.state = this.state | config.CREDENTIAL_STATUS.NON_BEAME_CERT;
		}else{
		
			this.state = this.state | config.CREDENTIAL_STATUS.BEAME_ISSUED_CERT;
			this.state = this.state & config.CREDENTIAL_STATUS.NON_BEAME_CERT;
		}

		if(this.doesHavePrivateKey()){
			this.state = this.state & config.CREDENTIAL_STATUS.PRIVATE_KEY;
		}else{
			this.state = this.state | config.CREDENTIAL_STATUS.PRIVATE_KEY;
		}
};

Credential.prototype.readCertificateDir = function(){
	var credentials = {};
	this.state = this.state | config.CREDENTIAL_STATUS.DIR_NOTREAD;

	_.map(config.certificatefiles, function (key, value) {
		try {
			this.value = fs.readfilesync(makepath(this.certDir, key));
		}
		catch (e) {
			logger.debug("readcertdata error " +  e.tostring());
		}
	});

	credentials.path = certificatesDir;

	try {
		var filecontent = fs.readfilesync(makepath(this.certDir, config.metadatafilename));
		//noinspection es6modulesdependencies,nodemodulesdependencies
		_.map(json.parse(filecontent), function (key, value) {
			this.value.credentials[value] = key;
		});
	} catch (e) {
	    logger.debug("readcertdata error " + e.tostring());
	}
};


Credential.prototype.doesHavePrivateKey = function(){
	this.PRIVATE_KEY && return true;
	return false;
};

Credential.prototype.doesHaveX509 = function(){
	this.X509 && return true;
	return false;
}

Credential.prototype.extractCommonName = function(){

}

Credential.prototype.extractAltNames = function(){

}

Credential.prototype.getPublicKey = function(){
	
}

Credential.prototype.sign = function(){

}



function BeameStoreV2() {

	if (beameStoreInstance) {
		return beameStoreInstance;
	}

	mkdirp.sync(config.localCertsDir);
	mkdirp.sync(config.remoteCertsDir);
	this.ensureFreshBeameStore();

	this.listFunctions = [
		{type: "developer", 'func': this.listCurrentDevelopers},
		{type: "atom", 'func': this.listCurrentAtoms},
		{type: "edgeclient", 'func': this.listCurrentEdges},
		{type: "localclient", 'func': this.listCurrentLocalClients}
	];

	this.searchFunctions = [
		{type: "developer", 'func': this.searchDevelopers},
		{type: "atom", 'func': this.searchAtoms},
		{type: "edgeclient", 'func': this.searchEdge},
		{type: "localclient", 'func': this.searchLocal}
	];

	beameStoreInstance = this;
}
