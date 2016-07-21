/**
 * Created by zenit1 on 17/07/2016.
 */
var config = require('../test_config');
var options = config.options;
var assert = config.assert;
var beameUtils = config.beameUtils;
var dataServices = config.dataServices;
var developerServices = config.developerServices;

function run() {
	describe('Test Developer flow', function () {
		this.timeout(1000000);

		var developerHostName, name, email, developerDirPath;

		it('Should create developer', function (done) {

			var rnd = beameUtils.randomString(8);
			name = 'test-developer-' + rnd;
			email = name + '@beame.io';

			console.log('############ creating developer %j ############', email);


			developerServices.createDeveloper(name, email, function (error, payload) {

				console.log('############ create developer response received with payload %j and error %j ############', payload, error);

				//validate payload & error
				assert.isNull(error, error && error.message);
				assert.isNotNull(payload, error && error.message);

				//validate hostname
				developerHostName = payload["hostname"];
				assert.isNotNull(developerHostName, 'Developer hostname mismatch');
				process.env.developer_fqdn = developerHostName;


				//validate path
				developerDirPath = beameUtils.findHostPathSync(developerHostName);
				assert.isNotNull(developerDirPath, "Developer directory not found");

				//validate certificate structure
				var certsCreated = beameUtils.validateHostCertsSync(developerHostName, global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
				assert.isTrue(certsCreated, 'Certificates mismatch');


				//validate metadata json
				var metadata = beameUtils.getHostMetadataSync(developerHostName);
				assert.isNotNull(metadata, 'Metadata mismatch');

				assert.equal(metadata["hostname"], developerHostName, 'Metadata hostname is incorrect');
				assert.equal(metadata["email"], email, 'Metadata email is incorrect');
				assert.equal(metadata["name"], name, 'Metadata name is incorrect');


				done()
			});

		});

		it('Should update developer', function (done) {

			if (options.run_update === "true") {
				var rnd = beameUtils.randomString(4);
				name += ('-' + rnd);

				console.log('############ updating developer profile %j ############', name);

				//validate pre-requisites
				assert.isNotNull(developerHostName);

				developerServices.updateProfile(developerHostName, name, email, function (error, payload) {

					console.log('############ update developer profile response received with payload %j and error %j ############', payload, error);

					//validate payload & error
					assert.isNull(error, error && error.message);
					assert.isNotNull(payload, error && error.message);

					done()

				});
			}
			else {
				done()
			}
		});

		it('Should revoke developer certs', function (done) {

			if (options.run_cert === "true") {
				console.log('############ revoking developer certs %j ############', developerHostName);

				//validate pre-requisites
				assert.isNotNull(developerHostName);
				assert.isNotNull(developerDirPath);

				developerServices.revokeCert(developerHostName, function (error, payload) {

					console.log('############ revoke developer certs response received with payload %j and error %j ############', payload, error);

					//validate payload & error
					assert.isNull(error, error && error.message);
					assert.isNotNull(payload, error && error.message);

					//validate recovery file
					var isRecoveryCodeExists = dataServices.isPathExists(beameUtils.makePath(developerDirPath, global.CertFileNames.RECOVERY));
					assert.isTrue(isRecoveryCodeExists, 'Recovery code not found');

					done()

				});
			}
			else {
				done()
			}


		});

		it('Should restore developer certs', function (done) {

			if (options.run_cert === "true") {

				console.log('############ restoring developer certs %j ############', developerHostName);

				//validate pre-requisites
				assert.isNotNull(developerHostName);
				assert.isNotNull(developerDirPath);

				developerServices.restoreCert(developerHostName, function (error, payload) {

					console.log('############ restore developer certs response received with payload %j and error %j ############', payload, error);

					//validate payload & error
					assert.isNull(error, error && error.message);
					assert.isNotNull(payload, error && error.message);

					//validate certificate structure
					var certsCreated = beameUtils.validateHostCertsSync(developerHostName, global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
					assert.isTrue(certsCreated, 'Certificates mismatch');

					done()

				});
			}
			else {
				done()
			}


		});

		it('Should renew developer certs', function (done) {

			if (options.run_cert === "true") {

				console.log('############ renewing developer certs %j ############', developerHostName);

				//validate pre-requisites
				assert.isNotNull(developerHostName);
				assert.isNotNull(developerDirPath);

				developerServices.renewCert(developerHostName, function (error, payload) {

					console.log('############ renew developer certs response received with payload %j and error %j ############', payload, error);

					//validate payload & error
					assert.isNull(error, error && error.message);
					assert.isNotNull(payload, error && error.message);

					//validate certificate structure
					var certsCreated = beameUtils.validateHostCertsSync(developerHostName, global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
					assert.isTrue(certsCreated, 'Certificates mismatch');

					done()

				});
			}
			else {
				done()
			}

		});

		it('Should bring developer stats', function (done) {

			if (options.run_stats === "true") {

				console.log('############ bringing stats for developer  %j ############', developerHostName);

				//validate pre-requisites
				assert.isNotNull(developerHostName);

				developerServices.getStats(developerHostName, function (error, payload) {

					if (!error) {
						console.log('############ bring stats developer stats ############');
						console.log(payload);
					}
					else {
						console.log('############ bring stats developer stats error %j ############', error);
					}

					//validate payload & error
					assert.isNull(error, error && error.message);
					assert.isNotNull(payload, error && error.message);

					done()

				});
			}
			else {
				done()
			}
		});

	});
}

module.exports = {run};
