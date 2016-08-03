/**
 * Created by zenit1 on 27/07/2016.
 */
var config            = require('../test_config');
var options           = config.options;
var assert            = config.assert;
var beameUtils        = config.beameUtils;
var dataServices      = config.dataServices;
var developerServices = config.developerServices;
var globalConfig      = require('../../../config/Config');

function run() {
	describe('Test Developer registration flow', function () {
		this.timeout(1000000);

		var developerHostName, name, email, developerUid;

		it('Should register developer', function (done) {

			var rnd = beameUtils.randomString(8);
			name    = 'test-developer-' + rnd;
			email   = name + '@beame.io';

			console.log('############ registering developer %j ############', email);


			developerServices.registerDeveloper(name, email, function (error, payload) {

				console.log('############ register developer response received with payload %j and error %j ############', payload, error);

				//validate payload & error
				assert.isNull(error, error && error.message);
				assert.isNotNull(payload, error && error.message);

				//validate hostname
				developerHostName = payload["hostname"];
				assert.isNotNull(developerHostName, 'Developer hostname mismatch');

				//uid
				developerUid = payload["uid"];
				assert.isNotNull(developerUid, 'Developer uid mismatch');

				done()
			});

		});

		it('Should complete registration', function (done) {

			console.log('############ completing register developer %j ############', developerHostName);


			developerServices.completeDeveloperRegistration(developerHostName, developerUid, function (error, payload) {

				console.log('############ complete register developer response received with payload %j and error %j ############', payload, error);

				//validate payload & error
				assert.isNull(error, error && error.message);
				assert.isNotNull(payload, error && error.message);

				//validate path
				var developerDirPath = beameUtils.findHostPathSync(developerHostName);
				assert.isNotNull(developerDirPath, "Developer directory not found");

				//validate certificate structure
				var certsCreated = dataServices.validateHostCertsSync(developerHostName, globalConfig.ResponseKeys.NodeFiles, globalConfig.AppModules.UnitTest);
				assert.isTrue(certsCreated, 'Certificates mismatch');


				//validate metadata json
				var metadata = dataServices.getHostMetadataSync(developerHostName);
				assert.isNotNull(metadata, 'Metadata mismatch');


				done()
			});

		});

	});
}

module.exports = {run};