//
// Created by Zeev Glozman
// Beame.io Ltd, 2016.
//
/*jshint esversion: 6 */

var async                  = require('async');
//var exec        = require('child_process').exec;
var _                      = require('underscore');
var os                     = require('os');
var config                 = require('../../config/Config');
const module_name          = config.AppModules.BeameStore;
var logger                 = new (require('../utils/Logger'))(module_name);
var jmespath               = require('jmespath');
var beameDirApi            = require('./BeameDirServices');
var sprintf                = require('sprintf');
var mkdirp                 = require('mkdirp');
var path                   = require('path');
var request                = require('sync-request');
var url                    = require('url');
var BeameStoreDataServices = require('../services/BeameStoreDataServices');


var authData = {
	"PK_PATH":   "/authData/pk.pem",
	"CERT_PATH": "/authData/x509.pem"
};

class Credential {

	/**
	 *
	 * @param {IdentityType} type
	 * @param {String|null} [parent_fqdn]
	 * @param {Array.<SecurityPolicy>} [policies]
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @param {String|null} [local_ip]
	 */
	constructor(type, parent_fqdn, policies, name, email, local_ip) {

		this.type        = type;
		this.parent_fqdn = parent_fqdn;
		this.name        = name;
		this.email       = email;
		this.localIp     = local_ip;
		this.permissions = policies.map(cred=> this.permissions = this.permissions | cred);


		this.state        = config.CredentialStatus.DIR_NOTREAD;
		this.dirShaStatus = "";
		this.determineCertStatus();
		this.dataHelper = new BeameStoreDataServices(this.fqdn);
	}

	determineCertStatus() {


		if (this.dirShaStatus && this.dirShaStatus.length !== 0) {
			//
			// This means this is a brand new object and we dont know anything at all
			this.credentials = this.readCertificateDir();

		}
		if (this.doesHaveX509()) {
			this.state = this.state | config.CredentialStatus.CERT;
		}

		if (this.state & config.CredentialStatus.CERT && this.extractCommonName().indexOf("beameio.net")) {
			this.state = this.state | config.CredentialStatus.BEAME_ISSUED_CERT;
			this.state = this.state & config.CredentialStatus.NON_BEAME_CERT;
		} else {

			this.state = this.state | config.CredentialStatus.BEAME_ISSUED_CERT;
			this.state = this.state & config.CredentialStatus.NON_BEAME_CERT;
		}

		if (this.doesHavePrivateKey()) {
			this.state = this.state & config.CredentialStatus.PRIVATE_KEY;
		} else {
			this.state = this.state | config.CredentialStatus.PRIVATE_KEY;
		}
	}


	getFqdnName(){
	
	}


	loadCredentialsObject() {
		var credentials = {};
		this.state      = this.state | config.CredentialStatus.DIR_NOTREAD;

		_.map(config.certificatefiles, function (key, value) {
			try {
				this.value = this.dataHelper.readObject(key);
			}
			catch (e) {
				logger.debug("readcertdata error " + e.tostring());
			}
		});

		credentials.path = certificatesDir;

		try {
			this.dataHelper.readObject(config.metadatafilename);
			//noinspection es6modulesdependencies,nodemodulesdependencies
			_.map(json.parse(filecontent), function (key, value) {
				this.value.credentials[value] = key;
			});
		} catch (e) {
			logger.debug("readcertdata error " + e.tostring());
		}
	}

	doesHavePrivateKey() {

	}

	doesHaveX509() {

	}

	extractCommonName() {
		var xcert = x509.parseCert(cert + "");
		if (xcert) {
		}
	}

	extractAltNames() {

	}

	getPublicKey() {
		var xcert = x509.parseCert(cert + "");
		if (xcert) {
			var publicKey = xcert.publicKey;
			var modulus   = new Buffer(publicKey.n, 'hex');
			var header    = new Buffer("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA", "base64");
			var midheader = new Buffer("0203", "hex");
			var exponent  = new Buffer("010001", "hex");
			var buffer    = Buffer.concat([header, modulus, midheader, exponent]);
			var rsaKey    = new NodeRsa(buffer, "public-der");
			rsaKey.importKey(buffer, "public-der");
			return rsaKey;
		}
		return {};
	}

	sign() {

	}
}

module.exports = Credential;
