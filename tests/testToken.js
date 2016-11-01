'use strict';

const fqdn = process.argv[2];

const BeameStore = require('../src/services/BeameStoreV2');
const AuthToken = require('../src/services/AuthToken');
const Credential = require('../src/services/Credential');

if(!fqdn) {
	throw new Error('FQDN is a required command line positional parameter');
}

const store = new BeameStore();
const cred = store.getCredential(fqdn);


	AuthToken.validate(AuthToken.create({'xyz': 1}, cred))
		.then(token=>{console.log('result', token)})
	.catch(e => console.error(e));

