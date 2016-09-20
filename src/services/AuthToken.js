'use strict';

const BeameStore = require('./BeameStoreV2');
const Credential = require('./Credential');

const timeFuzz = 5;

class AuthToken {

	// ttl - in seconds
	static create(data, signingCreds, ttl) {
		return new Promise((resolve, reject) => {
			if(!(signingCreds instanceof Credential)) {
				reject('signingCreds must be present and must be instance of Credential');
				return;
			}
			const now = Date.now();
			const token = {
				created_at: Math.round(now / 1000),
				valid_till: Math.round(now / 1000) + (ttl || 10),
				data: data || null
			};
			var ret = JSON.stringify(token);
			if(signingCreds) {
				ret = JSON.stringify(signingCreds.sign(ret));
			}
			resolve(ret);
		});
	}


	static validate(authToken) {
		return new Promise((resolve, reject) => {
			try {
				authToken = JSON.parse(authToken);
			} catch(e) {
				reject('Could not decode authToken JSON. authToken must be a valid JSON');
				return;
			}
			if(!authToken.signedData) { reject('authToken has no .signedData'); return; }
			if(!authToken.signedBy)   { reject('authToken has no .signedBy'); return; }
			if(!authToken.signature)  { reject('authToken has no .signature'); return; }

			const store = new BeameStore();
			const signerCreds = store.getCredential(authToken.signedBy);

			if(!signerCreds) {
				reject(`Signer (${authToken.signedBy}) credentials were not found`);
				return;
			}

			const signatureStatus = signerCreds.checkSignatureToken(authToken);
			if(!signatureStatus) {
				reject(`Bad signature`);
				return;
			}

			var signedData;
			try {
				signedData = JSON.parse(authToken.signedData);
			} catch(e) {
				reject('Could not decode authToken.signedData JSON. authToken.signedData must be a valid JSON');
				return;
			}

			const now = Math.round(Date.now() / 1000);

			if(signedData.created_at > now + timeFuzz) {
				reject(`authToken.signedData.created_at is in future - invalid token or incorrect clock`);
				return;
			}

			if(signedData.valid_till < now - timeFuzz) {
				reject(`authToken.signedData.valid_till is in the past - token expired`);
				return;
			}

			resolve(signedData.data);
		});
	}

}

module.exports = AuthToken;
