"use strict";

const assert = require('assert').strict;
const BeameStore = require('../../src/services/BeameStoreV2');
const AuthToken = require('../../src/services/AuthToken');

assert(process.env.BEAME_TESTS_CREDS_FQDN, "Env BEAME_TESTS_ROOT_CREDS_FQDN is required to run the tests");

describe('authToken_create', function () {
	this.timeout(100000);
	const store = new BeameStore();
	const cred = store.getCredential(process.env.BEAME_TESTS_CREDS_FQDN);

	it('Create authtoken', async () => {
		const token = AuthToken.create({'xyz': 1}, cred);
		assert(token);
	});

	it('Validate authtoken', async () => {
		const token = await AuthToken.validate(AuthToken.create({'xyz': 1}, cred));
		assert(token);
	});
});

