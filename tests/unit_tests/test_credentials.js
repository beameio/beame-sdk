/**
 * Created by zenit1 on 25/09/2016.
 */
"use strict";

const async = require('async');
const assert = require('assert').strict;
const appConfig = require('../../config/Config');
const commonUtils = require('../../src/utils/CommonUtils');
const beameUtils = require('../../src/utils/BeameUtils');
const store = new (require("../../src/services/BeameStoreV2"))();
const logger = new (require('../../src/utils/Logger'))("test_credentials");
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

/**
 * CMD to run from console
 *  env local_fqdn=[local_fqdn] name=[name] npm run test_local_credential
 **/
function createWithLocalCreds(local_fqdn, data) {
	describe('Test create with local creds', function () {
		this.timeout(1000000);

		let parent_fqdn = local_fqdn || process.env.BEAME_TESTS_LOCAL_FQDN;

		data = data || _getRandomRegistrationData(`${parent_fqdn}-child-`);
		console.log('*** createEntityWithLocalCreds data', data);
		let parent_cred;

		before(function (done) {

			assert(isString(parent_fqdn), 'Parent fqdn required');

			logger.info('find local creds');

			parent_cred = store.getCredential(parent_fqdn);

			assert(parent_cred, 'Parent credential not found');

			done()
		});

		it('Should create entity', function (done) {

			parent_cred.createEntityWithLocalCreds(parent_fqdn, data.name, data.email).then(metadata => {

				logger.info(`metadata received `, metadata);

				assert(metadata, `expected metadata`);
				assert(metadata.fqdn, `expected fqdn`);

				let cred = store.getCredential(metadata.fqdn);

				assert(cred, 'New credential not found inn store');


				done();

			}).catch(error=> {
				var msg = config.Logger.formatError(error);

				logger.error(msg, error);
				assert.fail(msg);
				done();
			});
		});

	});

}

function createCustomWithLocalCreds(local_fqdn, custom_fqdn, data) {
	describe('Test create with local creds', function () {
		this.timeout(1000000);
		const rnd = config.beameUtils.randomString(8).toLowerCase();


		let parent_fqdn = local_fqdn || process.env.BEAME_TESTS_LOCAL_FQDN;
		if(!custom_fqdn) {
			if (process.env.BEAME_TESTS_CUSTOM_FQDN) {
				custom_fqdn = process.env.BEAME_TESTS_CUSTOM_FQDN;
			} else {
				custom_fqdn = `c-${rnd}.tests`;
			}
		}

		data = data || _getRandomRegistrationData(`${parent_fqdn}-child-`);
		console.log('*** createCustomWithLocalCreds data', data);
		console.log('*** createCustomWithLocalCreds parent_fqdn custom_fqdn', parent_fqdn, custom_fqdn);
		let parent_cred;

		before(function (done) {

			assert(isString(parent_fqdn), 'Parent fqdn required');

			logger.info('find local creds');

			parent_cred = store.getCredential(parent_fqdn);

			assert(parent_cred, 'Parent credential not found');

			done()
		});

		it('Should create entity', function (done) {

			parent_cred.createCustomEntityWithLocalCreds(parent_fqdn, custom_fqdn, data.name, data.email).then(metadata => {

				logger.info(`metadata received `, metadata);

				assert(metadata, `expected metadata`);
				assert(metadata.fqdn, `expected fqdn`);

				let cred = store.getCredential(metadata.fqdn);

				assert(cred, 'New credential not found inn store');

				done();

			}).catch(error=> {
				console.error(error);
				console.error(error.EntityValidationErrors);
				var msg = config.Logger.formatError(error);

				logger.error(msg, error);
				assert.fail(msg);
				done();
			});
		});

	});

}

/**
 * CMD to run from console
 *  env signed_fqdn=[signed_fqdn] name=[name] npm run test_sign_credential
 **/
function signAndCreate(signing_fqdn, data) {
	describe('Test create with local signature', function () {
		this.timeout(1000000);

		let parent_fqdn = signing_fqdn || process.env.BEAME_TESTS_SIGNING_FQDN;

		data = data || _getRandomRegistrationData(`${parent_fqdn}-child-`);

		let signing_cred;

		before(function (done) {

			assert(isString(parent_fqdn), 'Parent fqdn required');

			logger.info(`find local creds for ${parent_fqdn}`);

			signing_cred = store.getCredential(parent_fqdn);

			assert(signing_cred, 'Parent credential not found');

			done()
		});

		it('Should create entity', function (done) {

			signing_cred.signWithFqdn(parent_fqdn, commonUtils.generateDigest(data)).then(authToken=> {
				signing_cred.createEntityWithAuthToken(authToken, data.name, data.email).then(metadata => {

					logger.info(`metadata received `, metadata);

					assert(metadata, `expected metadata`);
					assert(metadata.fqdn, `expected fqdn`);

					let cred = store.getCredential(metadata.fqdn);

					assert(cred, 'New credential not found inn store');


					done();

				});
			}).catch(error=> {
				var msg = config.Logger.formatError(error);

				logger.error(msg, error);
				assert.fail(0, 1, msg);

				done();
			});


		});

	});
}


function testFlow() {

	describe('Test full flow', function () {
		this.timeout(1000000);

		let devCreds,
			fqdn = process.env.BEAME_TESTS_SIGNING_FQDN || appConfig.beameDevCredsFqdn,
			zeroLevelData = _getRandomRegistrationData('zero-level');

		before(function (done) {

			devCreds = store.getCredential(fqdn);

			assert(devCreds, 'Parent credential not found');

			done()
		});

		let initialAuthToken;

		it('Should create authToken', (done) => {
			devCreds.signWithFqdn(fqdn, zeroLevelData).then(t=> {

				assert(t);
				initialAuthToken = t;
				logger.info(`auth token received ${initialAuthToken}`);
				done();
			}).catch(error=> {
				logger.error(error);
				process.exist(2);
			});
		});


		let registrationAuthToken;

		it('Should register entity', done => {
			let authServerRegisterUrl = appConfig.authServerURL + '/test/sdk/register';

			provApi.postRequest(authServerRegisterUrl, zeroLevelData, (error, payload)=> {
				if (error) {
					logger.error(error);
					process.exit(2);
				}
				assert(payload);

				registrationAuthToken = commonUtils.parse(payload.authToken);

				assert(registrationAuthToken);

				logger.debug(`auth token received from server`, registrationAuthToken);

				done();
			}, initialAuthToken);
		});

		let zeroLevelFqdn;

		it('Should complete registration with received server auth token', done=> {

			devCreds.createEntityWithAuthServer(commonUtils.stringify(registrationAuthToken, false), null, zeroLevelData.name, zeroLevelData.email).then(metadata => {

				logger.debug(`metadata received `, metadata);

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
				logger.info(`Creating entity ${data.name} under ${zeroLevelFqdn}`);

				devCreds.createEntityWithLocalCreds(zeroLevelFqdn, data.name, data.email).then(metadata => {

					logger.info(`metadata received for ${data.name}`, metadata);
					cb(null, metadata);

				}).catch(error=> {
					var msg = config.Logger.formatError(error);

					logger.error(msg, error);
					cb(error, null);
				});
			}

			function createWithToken(cb, ind) {
				console.log(`token call ${ind} received`);

				let newData2 = _getRandomRegistrationData(`${ind}-${zeroLevelFqdn}-child-1-`);
				logger.info(`Creating entity ${newData2.name} under ${zeroLevelFqdn}`);

				devCreds.signWithFqdn(zeroLevelFqdn, commonUtils.generateDigest(newData2)).then(authToken=> {
					devCreds.createEntityWithAuthToken(authToken, newData2.name, newData2.email).then(metadata => {

						logger.info(`metadata received for ${newData2.name}`, metadata);

						cb(null, metadata);

					});
				}).catch(error=> {
					var msg = config.Logger.formatError(error);

					logger.error(msg, error);
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
						logger.error(`create children`, error);
					}
					assert(!error);
					done();
				}
			);

		});

	});

}

var test = process.env.BEAME_TESTS_TYPE;

if (!test) {
	logger.error(`test type required`);
	process.exit(1)
}

//createWithLocalCreds('tl5h1ipgobrdqsj6.v1.p.beameio.net',{name:'Instance Information Services',email:null});

switch (test) {
case 'flow':
	testFlow();
	break;
case 'sign_and_create':
	signAndCreate();
	break;
case 'local':
	createWithLocalCreds();
	break;
case 'local_custom':
	createCustomWithLocalCreds();
	break;
}


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
// 			credential.createEntityWithAuthServer(authToken, null, name || process.env.BEAME_TESTS_NAME || config.beameUtils.randomString(8), null).then(metadata => {
//
// 				logger.info(`metadata received `, metadata);
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
// 				var msg = config.Logger.formatError(error);
//
// 				logger.error(msg, error);
// 				assert.fail(0, 1, msg);
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
// 	let fqdn = process.env.BEAME_TESTS_SIGNED_FQDN || config.BeameConfig.beameDevCredsFqdn;
//
// 	let cred;
//
// 	before(function (done) {
//
// 		assert(isString(fqdn), 'Parent fqdn required');
//
// 		logger.info(`find local creds for ${fqdn}`);
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
// 			var msg = config.Logger.formatError(error);
//
// 			logger.error(msg, error);
// 			assert.fail(0, 1, msg);
//
// 			done();
// 		});
//
//
// 	});
// }
//
// function createSnsTopic() {
// 	let fqdn = process.env.BEAME_TESTS_LOCAL_FQDN || config.BeameConfig.beameDevCredsFqdn;
//
// 	let cred;
//
//
// 	describe('Test create sns topic', function () {
// 		this.timeout(1000000);
//
// 		before(function (done) {
//
// 			assert(isString(fqdn), 'Fqdn required');
//
// 			logger.info(`find local creds for ${fqdn}`);
//
// 			cred = store.getCredential(fqdn);
//
// 			assert(cred, 'Parent credential not found');
//
// 			done()
// 		});
//
// 		it('Should create entity', function (done) {
//
// 			cred.subscribeForChildRegistration(fqdn).then(() => {
//
// 				console.log('topic created');
//
// 				done();
// 			}).catch(error=> {
// 				var msg = config.Logger.formatError(error);
//
// 				logger.error(msg, error);
// 				assert.fail(0, 1, msg);
//
// 				done();
// 			});
//
//
// 		});
//
// 	});
//
//
// }
