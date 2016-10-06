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

AuthToken.create({'xyz': 1}, cred)
	.then(t => AuthToken.validate(t))
	.then(r => console.log('result', r))
	.catch(e => console.error(e));

