/**
 * Created by zenit1 on 25/09/2016.
 */
"use strict";

var config     = require('./config');
var assert     = config.assert;
var store      = config.beameStore;
var logger     = new config.Logger("TestCredential");
const CommonUtils = require('../../src/utils/CommonUtils');


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

/**
 * CMD to run from console
 *  env signed_fqdn=[signed_fqdn] name=[name] npm run test_sign_credential
 **/
function signAndCreate(signed_fqdn, name) {
	describe('Test create with local signature', function () {
		this.timeout(1000000);

		let parent_fqdn = signed_fqdn || process.env.signed_fqdn;

		let signing_cred;

		before(function (done) {

			assert.isString(parent_fqdn, 'Parent fqdn required');

			logger.info(`find local creds for ${parent_fqdn}`);

			signing_cred = store.getCredential(parent_fqdn);

			assert.isNotNull(signing_cred, 'Parent credential not found');

			done()
		});

		it('Should create entity', function (done) {

			signing_cred.signWithFqdn(parent_fqdn, null).then(authToken=> {
				signing_cred.createEntityWithAuthServer(authToken, null, name || process.env.name || config.beameUtils.randomString(8), null).then(metadata => {

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


function createAuthToken(){
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

		cred.signWithFqdn(fqdn, null).then(authToken=> {

				assert.isString(authToken);

				console.log(CommonUtils.stringify(authToken,false));

				done();
		}).catch(error=> {
			var msg = config.Logger.formatError(error);

			logger.error(msg, error);
			assert.fail(0, 1, msg);

			done();
		});


	});
}

module.exports = {createWithLocalCreds, signAndCreate, createWithAuthToken, createAuthToken};
