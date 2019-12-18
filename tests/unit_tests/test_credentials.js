const assert = require('assert').strict;

const commonUtils = require('../../src/utils/CommonUtils');
const beameUtils = require('../../src/utils/BeameUtils');
const store = new (require("../../src/services/BeameStoreV2"))();
const config = require("../../config/Config");
const debug = require("debug")(config.debugPrefix + "unittests:credentials");

function _getRandomRegistrationData(prefix) {
	let rnd = beameUtils.randomString(8);
	return {
		name:  prefix + rnd,
		email: rnd + '@example.com'
	};
}

assert(process.env.BEAME_TESTS_ROOT_CREDS_FQDN, "Env BEAME_TESTS_ROOT_CREDS_FQDN is required to run the tests");

describe('local_creds_create', function () {
	this.timeout(100000);

	let parent_fqdn = process.env.BEAME_TESTS_ROOT_CREDS_FQDN;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	debug('*** createEntityWithLocalCreds data %j', data);
	let parent_cred;

	before(function () {
		assert(parent_fqdn, 'Parent fqdn required');
		debug('find local creds');
		parent_cred = store.getCredential(parent_fqdn);
		assert(parent_cred, 'Parent credential not found');
	});

	it('Should create entity', async function () {
		const metadata = await parent_cred.createEntityWithLocalCreds(parent_fqdn, data.name, data.email)
		debug('metadata received %j', metadata);
		assert(metadata, `expected metadata`);
		assert(metadata.fqdn, `expected fqdn`);
		let cred = store.getCredential(metadata.fqdn);
		assert(cred, 'New credential not found in store');
	});

});

describe("auth_server_creds_create", function () {
	this.timeout(100000);
	let fqdn = process.env.BEAME_TESTS_ROOT_CREDS_FQDN;
	let cred, data;
	debug(`env signed fqdn is ${fqdn}`);

	before(function () {
		assert(fqdn, 'Parent fqdn required');
		debug(`find local creds for ${fqdn}`);

		cred = store.getCredential(fqdn);
		assert(cred, 'Parent credential not found');
	});

	it('Should create entity', function (done) {
		cred.signWithFqdn(fqdn, data || process.env.BEAME_TESTS_DATA_TO_SIGN).then(authToken=> {
			assert(authToken);
			debug(commonUtils.stringify(authToken, false));
			cred.createEntityWithAuthServer(authToken, null,process.env.BEAME_TESTS_CUSTOM_FQDN || beameUtils.randomString(8), null).then(metadata => {
				debug('metadata received %j', metadata);

				assert(metadata, `expected metadata`);
				assert(metadata.fqdn, `expected fqdn`);

				let cred = store.getCredential(metadata.fqdn);
				assert(cred, 'New credential not found inn store');
				done();
			});
		}).catch(error=> {
			debug(error);
			assert.fail(error);
			done();
		});
	});
});

describe('sign_and_create', function () {
	this.timeout(100000);

	let parent_fqdn = process.env.BEAME_TESTS_ROOT_CREDS_FQDN;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	let signing_cred;

	before(function () {
		assert(parent_fqdn, 'Parent fqdn required');
		debug(`find local creds for ${parent_fqdn}`);
		signing_cred = store.getCredential(parent_fqdn);
		assert(signing_cred, 'Parent credential not found');
	});

	it('Should create entity', async function () {
		const authToken = await signing_cred.signWithFqdn(parent_fqdn, commonUtils.generateDigest(data));
		const metadata = await signing_cred.createEntityWithAuthToken(authToken, data.name, data.email);
		debug('metadata received %j', metadata);
		assert(metadata, `expected metadata`);
		assert(metadata.fqdn, `expected fqdn`);
		let cred = store.getCredential(metadata.fqdn);
		assert(cred, 'New credential not found inn store');
	});
});

describe('sns_topic', function () {
	this.timeout(100000);
	let fqdn = process.env.BEAME_TESTS_ROOT_CREDS_FQDN;
	let cred;

	before(function () {
		assert(fqdn, 'Fqdn required');
		debug(`find local creds for ${fqdn}`);
		cred = store.getCredential(fqdn);
		assert(cred, 'Parent credential not found');
	});

	it('Should create entity', async function () {
		await cred.subscribeForChildRegistration(fqdn);
		debug('topic created');
	});
});

describe('local_creds_isrevoked', function() {
	this.timeout(100000);

	let parent_fqdn = process.env.BEAME_TESTS_ROOT_CREDS_FQDN;

	it('Create, revoke entity and check revoked state', async () => {
		const data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
		const parent_cred = store.getCredential(parent_fqdn);
		const metadata = await parent_cred.createEntityWithLocalCreds(parent_fqdn, data.name, data.email);
		debug('metadata received %j', metadata);
		assert(metadata, `expected metadata`);
		assert(metadata.fqdn, `expected fqdn`);
		let cred = store.getCredential(metadata.fqdn);
		assert(cred, 'New credential not found inn store');
		assert(!cred.revoked, 'Should not be revoked at first');
		await cred.revokeCert(null, cred.fqdn, cred.fqdn);
		assert(cred.revoked, 'Should be revoked after revocation');
	});

	// TODO: check with external revokation
	// TODO: check with force = true
});
