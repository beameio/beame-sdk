const assert = require('assert').strict;
const commonUtils = require('../../src/utils/CommonUtils');
const beameUtils = require('../../src/utils/BeameUtils');
const store = new (require("../../src/services/BeameStoreV2"))();
const debug = require("debug")("test_credentials");

function _getRandomRegistrationData(prefix) {
	let rnd = beameUtils.randomString(8);
	return {
		name:  prefix + rnd,
		email: rnd + '@example.com'
	};
}

if(!process.env.BEAME_TESTS_LOCAL_ROOT_FQDN)
	throw "Env BEAME_TESTS_LOCAL_ROOT_FQDN is required";

describe('local_creds_create', function () {
	this.timeout(100000);

	let parent_fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	console.log('*** createEntityWithLocalCreds data', data);
	let parent_cred;

	before(function () {
		assert(parent_fqdn, 'Parent fqdn required');
		debug('find local creds');
		parent_cred = store.getCredential(parent_fqdn);
		assert(parent_cred, 'Parent credential not found');
	});

	it('Should create entity', function (done) {
		parent_cred.createEntityWithLocalCreds(parent_fqdn, data.name, data.email).then(metadata => {
			debug(`metadata received ${metadata}`);

			assert(metadata, `expected metadata`);
			assert(metadata.fqdn, `expected fqdn`);

			let cred = store.getCredential(metadata.fqdn);

			assert(cred, 'New credential not found inn store');
			done();
		}).catch(error=> {
			debug(error);
			assert.fail(error);
			done();
		});
	});

});

describe('local_creds_custom_create', function () {
	this.timeout(100000);
	const rnd = beameUtils.randomString(8).toLowerCase();

	let parent_fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
	let custom_fqdn = process.env.BEAME_TESTS_CUSTOM_FQDN || `c-${rnd}.tests`;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	console.log('*** createCustomWithLocalCreds data', data);
	console.log('*** createCustomWithLocalCreds parent_fqdn custom_fqdn', parent_fqdn, custom_fqdn);
	let parent_cred;

	before(function () {
		assert(parent_fqdn, 'Parent fqdn required');
		debug('find local creds');
		parent_cred = store.getCredential(parent_fqdn);
		assert(parent_cred, 'Parent credential not found');
	});

	it('Should create entity', function (done) {
		parent_cred.createCustomEntityWithLocalCreds(parent_fqdn, custom_fqdn, data.name, data.email).then(metadata => {
			debug(`metadata received ${metadata}`);
			assert(metadata, `expected metadata`);
			assert(metadata.fqdn, `expected fqdn`);

			let cred = store.getCredential(metadata.fqdn);
			assert(cred, 'New credential not found inn store');

			done();
		}).catch(error=> {
			debug(error);
			debug(error.EntityValidationErrors);
			assert.fail(error);
			done();
		});
	});

});

describe("auth_server_creds_create", function () {
	this.timeout(100000);
	let fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
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
				debug(`metadata received ${metadata}`);

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

	let parent_fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	let signing_cred;

	before(function () {
		assert(parent_fqdn, 'Parent fqdn required');
		debug(`find local creds for ${parent_fqdn}`);
		signing_cred = store.getCredential(parent_fqdn);
		assert(signing_cred, 'Parent credential not found');
	});

	it('Should create entity', function (done) {
		signing_cred.signWithFqdn(parent_fqdn, commonUtils.generateDigest(data)).then(authToken=> {
			signing_cred.createEntityWithAuthToken(authToken, data.name, data.email).then(metadata => {
				debug(`metadata received ${metadata}`);

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

describe('sns_topic', function () {
	this.timeout(100000);
	let fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
	let cred;

	before(function () {
		assert(fqdn, 'Fqdn required');
		debug(`find local creds for ${fqdn}`);
		cred = store.getCredential(fqdn);
		assert(cred, 'Parent credential not found');
	});

	it('Should create entity', function (done) {
		cred.subscribeForChildRegistration(fqdn).then(() => {
			debug('topic created');
			done();
		}).catch(error=> {
			debug(error);
			assert.fail(error);
			done();
		});
	});
});