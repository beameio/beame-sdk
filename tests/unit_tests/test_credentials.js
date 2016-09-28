/**
 * Created by zenit1 on 25/09/2016.
 */
"use strict";

var config      = require('./config');
const appConfig = require('../../config/Config');

var assert        = config.assert;
var store         = config.beameStore;
var logger        = new config.Logger("TestCredential");
var provApi       = config.ProvisionApi;
const CommonUtils = config.CommonUtils;


/**
 * CMD to run from console
 *  env local_fqdn=[local_fqdn] name=[name] npm run test_local_credential
 **/
function createWithLocalCreds(local_fqdn, name) {
	describe('Test create with local creds', function () {
		this.timeout(1000000);

		let parent_fqdn = local_fqdn || process.env.local_fqdn;

		let parent_cred;

		before(function (done) {

			assert.isString(parent_fqdn, 'Parent fqdn required');

			logger.info('find local creds');

			parent_cred = store.getCredential(parent_fqdn);

			assert.isNotNull(parent_cred, 'Parent credential not found');

			done()
		});

		it('Should create entity', function (done) {

			parent_cred.createEntityWithLocalCreds(parent_fqdn, name || process.env.name || config.beameUtils.randomString(8), null).then(metadata => {

				logger.info(`metadata received `, metadata);

				assert.isNotNull(metadata, `expected metadata`);
				assert.isNotNull(metadata.fqdn, `expected fqdn`);

				let cred = store.getCredential(metadata.fqdn);

				assert.isNotNull(cred, 'New credential not found inn store');

				done();

			}).catch(error=> {
				var msg = config.Logger.formatError(error);

				logger.error(msg, error);
				assert.fail(0, 1, msg);

				done();
			});
		});

	});

}

function  generateDigest(data) {
	let str = CommonUtils.stringify(data, false);
	return require('crypto').createHash('sha256').update(str).digest("hex");
}

/**
 * CMD to run from console
 *  env signed_fqdn=[signed_fqdn] name=[name] npm run test_sign_credential
 **/
function signAndCreate(signed_fqdn, data) {
	describe('Test create with local signature', function () {
		this.timeout(1000000);

		let parent_fqdn = signed_fqdn;

		let signing_cred;

		before(function (done) {

			assert.isString(parent_fqdn, 'Parent fqdn required');

			logger.info(`find local creds for ${parent_fqdn}`);

			signing_cred = store.getCredential(parent_fqdn);

			assert.isNotNull(signing_cred, 'Parent credential not found');

			done()
		});

		it('Should create entity', function (done) {

			signing_cred.signWithFqdn(parent_fqdn, data).then(authToken=> {
				signing_cred.createEntityWithAuthServer(authToken, null, data.name, data.email).then(metadata => {

					logger.info(`metadata received `, metadata);

					assert.isNotNull(metadata, `expected metadata`);
					assert.isNotNull(metadata.fqdn, `expected fqdn`);

					let cred = store.getCredential(metadata.fqdn);

					assert.isNotNull(cred, 'New credential not found inn store');

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

function createWithAuthToken(name) {

	let credential = new config.Credential(config.beameStore);

	describe('Test create with auth token', function () {
		this.timeout(1000000);
		let authToken = process.env.token;

		before(function (done) {

			assert.isString(authToken, 'Parent fqdn required');

			done()
		});

		it('Should create entity', function (done) {

			credential.createEntityWithAuthServer(authToken, null, name || process.env.name || config.beameUtils.randomString(8), null).then(metadata => {

				logger.info(`metadata received `, metadata);

				assert.isNotNull(metadata, `expected metadata`);
				assert.isNotNull(metadata.fqdn, `expected fqdn`);

				let cred = store.getCredential(metadata.fqdn);

				assert.isNotNull(cred, 'New credential not found inn store');

				done();


			}).catch(error=> {
				var msg = config.Logger.formatError(error);

				logger.error(msg, error);
				assert.fail(0, 1, msg);

				done();
			});


		});

	});
}

function createAuthToken(data) {
	console.log(`env signed fqdn is ${process.env.signed_fqdn}`);
	let fqdn = process.env.signed_fqdn || config.BeameConfig.beameDevCredsFqdn;

	let cred;

	before(function (done) {

		assert.isString(fqdn, 'Parent fqdn required');

		logger.info(`find local creds for ${fqdn}`);

		cred = store.getCredential(fqdn);

		assert.isNotNull(cred, 'Parent credential not found');

		done()
	});

	it('Should create entity', function (done) {

		cred.signWithFqdn(fqdn, data || process.env.data_to_sign).then(authToken=> {

			assert.isString(authToken);

			console.log(CommonUtils.stringify(authToken, false));

			done();
		}).catch(error=> {
			var msg = config.Logger.formatError(error);

			logger.error(msg, error);
			assert.fail(0, 1, msg);

			done();
		});


	});
}

function createSnsTopic() {
	let fqdn = process.env.fqdn || config.BeameConfig.beameDevCredsFqdn;

	let cred;


	describe('Test create sns topic', function () {
		this.timeout(1000000);

		before(function (done) {

			assert.isString(fqdn, 'Fqdn required');

			logger.info(`find local creds for ${fqdn}`);

			cred = store.getCredential(fqdn);

			assert.isNotNull(cred, 'Parent credential not found');

			done()
		});

		it('Should create entity', function (done) {

			cred.subscribeForChildRegistration(fqdn).then(() => {

				console.log('topic created');

				done();
			}).catch(error=> {
				var msg = config.Logger.formatError(error);

				logger.error(msg, error);
				assert.fail(0, 1, msg);

				done();
			});


		});

	});


}


function _getRandomRegistrationData(prefix){
	let rnd  = config.beameUtils.randomString(8);
		return {
			name:  prefix + rnd,
			email: rnd + '@example.com'
		};
}

function testFlow() {

	describe('Test full flow', function () {
		this.timeout(1000000);

		let devCreds,
		    fqdn = process.env.signing_fqdn || appConfig.beameDevCredsFqdn,
		    zeroLevelData = _getRandomRegistrationData('zero-level');

		before(function (done) {

			devCreds = store.getCredential(fqdn);

			assert.isNotNull(devCreds, 'Parent credential not found');

			done()
		});

		let initialAuthToken;

		it('Should create authToken', (done) => {
			devCreds.signWithFqdn(fqdn, zeroLevelData).then(t=> {

				assert.isNotNull(t);
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
				if(error){
					logger.error(error);
					process.exit(2);
				}
				assert.isNotNull(payload);

				registrationAuthToken = CommonUtils.parse(payload.authToken);

				assert.isNotNull(registrationAuthToken);

				logger.debug(`auth token received from server`,registrationAuthToken);

				done();
			}, initialAuthToken);
		});

		let zeroLevelFqdn;

		it('Should complete registration with received server auth token',done=> {

			devCreds.createEntityWithAuthServer(CommonUtils.stringify(registrationAuthToken,false), null, zeroLevelData.name, zeroLevelData.email).then(metadata => {

				logger.debug(`metadata received `, metadata);

				assert.isNotNull(metadata, `expected metadata`);
				assert.isNotNull(metadata.fqdn, `expected fqdn`);

				let cred = store.getCredential(metadata.fqdn);

				assert.isNotNull(cred, 'New credential not found inn store');

				zeroLevelFqdn = metadata.fqdn;

				done();

			});

		});

		it('Should create child with zero level signature',done => {

			var newData = _getRandomRegistrationData(`${zeroLevelFqdn}-child-1-`);

			signAndCreate(zeroLevelFqdn,newData);

			done()
		});


	});

}

var test = process.env.test_type;

if (!test) {
	logger.error(`test type required`);
	process.exit(1)
}

switch (test) {
	case 'flow':
		testFlow();
		break;
}