const assert = require('assert').strict;
const beameUtils = require('../../src/utils/BeameUtils');
const store = new (require("../../src/services/BeameStoreV2"))();
const config = require("../../config/Config");
const debug = require("debug")(config.debugPrefix + "unittests:custom_credentials");

function _getRandomRegistrationData(prefix) {
	let rnd = beameUtils.randomString(8);
	return {
		name:  prefix + rnd,
		email: rnd + '@example.com'
	};
}

assert(process.env.BEAME_TESTS_ROOT_CREDS_FQDN, "Env BEAME_TESTS_ROOT_CREDS_FQDN is required to run the tests");

describe('local_creds_custom_create', function () {
	this.timeout(100000);
	const rnd = beameUtils.randomString(8).toLowerCase();

	let parent_fqdn = process.env.BEAME_TESTS_ROOT_CREDS_FQDN;
	let custom_fqdn = process.env.BEAME_TESTS_CUSTOM_FQDN || `c-${rnd}.tests`;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	debug('*** createCustomWithLocalCreds data %j', data);
	debug('*** createCustomWithLocalCreds parent_fqdn=%s custom_fqdn=%s', parent_fqdn, custom_fqdn);
	let parent_cred;

	before(function () {
		assert(parent_fqdn, 'Parent fqdn required');
		debug('find local creds');
		parent_cred = store.getCredential(parent_fqdn);
		assert(parent_cred, 'Parent credential not found');
	});

	it('Should create entity', async () => {
		let metadata = await parent_cred.createCustomEntityWithLocalCreds(parent_fqdn, custom_fqdn, data.name, data.email);
		debug('metadata received %j', metadata);
		assert(metadata, `expected metadata`);
		assert(metadata.fqdn, `expected fqdn`);

		let cred = store.getCredential(metadata.fqdn);
		assert(cred, 'New credential not found inn store');
	});

});

