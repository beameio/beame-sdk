/**
 * Created by zenit1 on 25/09/2016.
 */

const async = require('async');
const assert = require('assert').strict;
const appConfig = require('../../config/Config');
const commonUtils = require('../../src/utils/CommonUtils');
const beameUtils = require('../../src/utils/BeameUtils');
const store = new (require("../../src/services/BeameStoreV2"))();
const debug = require("debug")("test_credentials");
const provApi = new (require('../../src/services/ProvisionApi'))();

function _getRandomRegistrationData(prefix) {
	let rnd = beameUtils.randomString(8);
	return {
		name:  prefix + rnd,
		email: rnd + '@example.com'
	};
}

function isString(str) {
	return str && ((typeof str === 'string') || (str instanceof String));
}

if(!process.env.BEAME_TESTS_LOCAL_ROOT_FQDN)
	throw "Env BEAME_TESTS_LOCAL_ROOT_FQDN is required";

describe('local_creds', function () {
	this.timeout(1000000);

	let parent_fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	console.log('*** createEntityWithLocalCreds data', data);
	let parent_cred;

	before(function () {
		assert(isString(parent_fqdn), 'Parent fqdn required');
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

describe('local_custom_creds', function () {
	this.timeout(1000000);
	const rnd = beameUtils.randomString(8).toLowerCase();

	let parent_fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
	let custom_fqdn = process.env.BEAME_TESTS_CUSTOM_FQDN || `c-${rnd}.tests`;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	console.log('*** createCustomWithLocalCreds data', data);
	console.log('*** createCustomWithLocalCreds parent_fqdn custom_fqdn', parent_fqdn, custom_fqdn);
	let parent_cred;

	before(function () {
		assert(isString(parent_fqdn), 'Parent fqdn required');
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


describe('sign_and_create', function () {
	this.timeout(1000000);

	let parent_fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
	let data = _getRandomRegistrationData(`${parent_fqdn}-child-`);
	let signing_cred;

	before(function () {
		assert(isString(parent_fqdn), 'Parent fqdn required');
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
	this.timeout(1000000);
	let fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN;
	let cred;

	before(function () {
		assert(isString(fqdn), 'Fqdn required');
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


/*
describe('full_flow', function () {
	this.timeout(1000000);

	let devCreds,
		fqdn = process.env.BEAME_TESTS_LOCAL_ROOT_FQDN || appConfig.beameDevCredsFqdn,
		zeroLevelData = _getRandomRegistrationData('zero-level');

	before(function () {
		devCreds = store.getCredential(fqdn);
		assert(devCreds, 'Parent credential not found');
	});

	let initialAuthToken;

	it('Should create authToken', (done) => {
		devCreds.signWithFqdn(fqdn, zeroLevelData).then(t=> {

			assert(t);
			initialAuthToken = t;
			debug(`auth token received ${initialAuthToken}`);
			done();
		}).catch(error=> {
			debug(error);
			process.exit(2);
		});
	});


	let registrationAuthToken;

	it('Should register entity', done => {
		let authServerRegisterUrl = appConfig.authServerURL + '/api/v1/node/register'; //'/test/sdk/register';

		provApi.postRequest(authServerRegisterUrl, zeroLevelData, (error, payload)=> {
			if (error) {
				debug(error);
				process.exit(2);
			}
			assert(payload);

			registrationAuthToken = commonUtils.parse(payload.authToken);

			assert(registrationAuthToken);

			debug(`auth token received from server ${registrationAuthToken}`);

			done();
		}, initialAuthToken);
	});

	let zeroLevelFqdn;

	it('Should complete registration with received server auth token', done=> {

		devCreds.createEntityWithAuthServer(commonUtils.stringify(registrationAuthToken, false), null, zeroLevelData.name, zeroLevelData.email).then(metadata => {

			debug(`metadata received ${metadata}`);

			assert(metadata, `expected metadata`);
			assert(metadata.fqdn, `expected fqdn`);

			let cred = store.getCredential(metadata.fqdn);

			assert(cred, 'New credential not found inn store');

			zeroLevelFqdn = metadata.fqdn;

			done();

		});

	});

	it('Should create children', done => {

		function createWithLocal(cb, ind) {

			console.log(`local call ${ind} received`);

			let data = _getRandomRegistrationData(`${ind}-${zeroLevelFqdn}-child-1-`);
			debug(`Creating entity ${data.name} under ${zeroLevelFqdn}`);

			devCreds.createEntityWithLocalCreds(zeroLevelFqdn, data.name, data.email).then(metadata => {

				debug(`metadata received for ${data.name} ${metadata}`);
				cb(null, metadata);

			}).catch(error=> {
				debug(error);
				cb(error, null);
			});
		}

		function createWithToken(cb, ind) {
			console.log(`token call ${ind} received`);

			let newData2 = _getRandomRegistrationData(`${ind}-${zeroLevelFqdn}-child-1-`);
			debug(`Creating entity ${newData2.name} under ${zeroLevelFqdn}`);

			devCreds.signWithFqdn(zeroLevelFqdn, commonUtils.generateDigest(newData2)).then(authToken=> {
				devCreds.createEntityWithAuthToken(authToken, newData2.name, newData2.email).then(metadata => {
					debug(`metadata received for ${newData2.name} ${metadata}`);
					cb(null, metadata);
				});
			}).catch(error=> {
				debug(error);
				cb(error, null);
			});
		}

		console.log(`**************************** CALL CREATE CHILDREN *****************`);
		// let cnt   = 0,
		//     total = 4,
		//     cb    = (error) => {
		// 	    cnt++;
		// 	    assert.isNull(error);
		// 	    if (cnt == total) done()
		//     };


		async.parallel(
			[

				cb=>{createWithLocal(cb,1)},
				cb=>{createWithToken(cb,2)},

			],
			error=> {
				if (error) {
					debug(`create children ${error}`);
				}
				assert(!error);
				done();
			}
		);

	});

});
*/

//createWithLocalCreds('tl5h1ipgobrdqsj6.v1.p.beameio.net',{name:'Instance Information Services',email:null});
// function createWithAuthToken(name) {
//
// 	let credential = new config.Credential(config.beameStore);
//
// 	describe('Test create with auth token', function () {
// 		this.timeout(1000000);
// 		let authToken = process.env.BEAME_TESTS_TOKEN;
//
// 		before(function (done) {
//
// 			assert(isString(authToken), 'Parent fqdn required');
//
// 			done()
// 		});
//
// 		it('Should create entity', function (done) {
//
// 			credential.createEntityWithAuthServer(authToken, null, name || process.env.BEAME_TESTS_NAME || beameUtils.randomString(8), null).then(metadata => {
//
// 				debug(`metadata received ${metadata}`);
//
// 				assert(metadata, `expected metadata`);
// 				assert(metadata.fqdn, `expected fqdn`);
//
// 				let cred = store.getCredential(metadata.fqdn);
//
// 				assert(cred, 'New credential not found inn store');
//
// 				done();
//
//
// 			}).catch(error=> {
// 				debug(error);
// 				assert.fail(error);
//
// 				done();
// 			});
//
//
// 		});
//
// 	});
// }
//
// function createAuthToken(data) {
// 	console.log(`env signed fqdn is ${process.env.BEAME_TESTS_SIGNED_FQDN}`);
// 	let fqdn = process.env.BEAME_TESTS_SIGNED_FQDN || BeameConfig.beameDevCredsFqdn;
//
// 	let cred;
//
// 	before(function (done) {
//
// 		assert(isString(fqdn), 'Parent fqdn required');
//
// 		debug(`find local creds for ${fqdn}`);
//
// 		cred = store.getCredential(fqdn);
//
// 		assert(cred, 'Parent credential not found');
//
// 		done()
// 	});
//
// 	it('Should create entity', function (done) {
//
// 		cred.signWithFqdn(fqdn, data || process.env.BEAME_TESTS_DATA_TO_SIGN).then(authToken=> {
//
// 			assert(isString(authToken));
//
// 			console.log(commonUtils.stringify(authToken, false));
//
// 			done();
// 		}).catch(error=> {
// 			debug(error);
// 			assert.fail(error);
//
// 			done();
// 		});
//
//
// 	});
// }
//
