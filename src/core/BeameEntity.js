/** jshint esversion: 6 **/
'use strict'; 

/**
 * @typedef {Object } BeameAuthorizationToken 
 * @param {string} 
 * */
class BeameAuthorizationToken {
	var authenticationUrl;
	var signingFqdn;
	var otp;
	var timestamp;
	var signature;
};

class getFqdnOptions {
	var token, 
	var parentFqdn,
	var metadata,var useBeameMasterKey
	var useBeameMasterKey
};


class BeameEntity{

	/**
	 *
	 * @param {IdentityType} type
	 * @param {String|null} [parent_fqdn]
	 * @param {Array.<SecurityPolicy>} [policies]
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @param {String|null} [local_ip]
	 */

	constructor() {
			
	}
	
	getFqdn(getFqdnOptions){
		if(config.beameMasterCredFqdn && getFqdnOptions.useBeameMasterKey === true){
		
			return new Promise();
		}

		if(getFqdnOptions.parentFqdn){
			var parentCredentials = store.search(parentFqdn)[0];
			if(parentCredentials.doesHavePrivateKey() === true){
				//
				// We can use the local credentials to issue the request.
				//
				//
				return this._getFqdnWithLocalParentFqdn();
			}

		}
		if(getFqdnOptions.token && getFqdnOptions.token.authenticationUrl){
			return _getFqdnNameWithAuthorizationToken(getFqdnOptions.token);
		}
	}

	_getFqdnWithLocalParentFqdn(){

	}

	_getFqdnNameWithAuthorizationToken(){
	
	}
	
	getCerts(csr, 
}
