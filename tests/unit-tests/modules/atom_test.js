/**
 * Created by zenit1 on 17/07/2016.
 */
var config = require('../test_config');
var options = config.options;
var assert = config.assert;
var beameUtils = config.beameUtils;
var atomServices = config.atomServices;

/**
 * CMD to run from console
 *  env developer_fqdn=[developer_fqdn] npm run test_atom
 **/
function run() {
	describe('Test Atom flow', function () {
		this.timeout(1000000);

		var developerHostname, atomHostname, name, atomDirPath;

		it('Developer fqdn should be passed', function (done) {

			console.log('####### receive developer_fqdn');

			developerHostname = process.env.developer_fqdn;

			assert.isDefined(developerHostname, 'Developer hostname required');
			assert.isNotNull(developerHostname, 'Developer hostname required');

			console.log(developerHostname);

			done()
		});

		it('Should create atom', function (done) {

			var rnd = beameUtils.randomString(8);
			name = 'test-atom-' + rnd;

			console.log('############ creating atom %j for developer %j ############', name, developerHostname);


			atomServices.createAtom(developerHostname, name, function (error, payload) {

				console.log(`############ create atom response received with payload ${payload} and error ${error} ############`);

				//validate payload & error
				assert.isNull(error, error && error.message);
				assert.isNotNull(payload, error && error.message);

				//validate hostname
				atomHostname = payload["hostname"];
				assert.isNotNull(atomHostname, 'Developer hostname mismatch');
				process.env.atom_fqdn = atomHostname;

				//validate path
				atomDirPath = beameUtils.findHostPathSync(atomHostname);
				assert.isNotNull(atomDirPath, "Developer directory not found");

				//validate certificate structure
				var certsCreated = beameUtils.validateHostCertsSync(atomHostname, global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
				assert.isTrue(certsCreated, `Certificates mismatch for atom ${atomHostname}`);


				//validate metadata json
				var metadata = beameUtils.getHostMetadataSync(atomHostname);
				assert.isNotNull(metadata, `Metadata mismatch for atom ${atomHostname}`);

				assert.equal(metadata["hostname"], atomHostname, 'Metadata hostname is incorrect');


				done()
			});

		});

		// it('Should update atom', function (done) {
		//
		// 	if (options.run_update === "true") {
		// 		var rnd = beameUtils.randomString(4);
		// 		name += ('-' + rnd);
		//
		// 		console.log('############ updating atom profile %j ############', name);
		//
		// 		//validate pre-requisites
		// 		assert.isNotNull(atomHostname);
		//
		// 		atomServices.updateAtom(atomHostname, name, function (error, payload) {
		//
		// 			console.log('############ update atom profile response received with payload %j and error %j ############', payload, error);
		//
		// 			//validate payload & error
		// 			assert.isNull(error, error && error.message);
		// 			assert.isNotNull(payload, error && error.message);
		//
		// 			done()
		//
		// 		});
		// 	}
		// 	else {
		// 		done()
		// 	}
		// });
		//
		// it('Should revoke atom certs', function (done) {
		// 	if (options.run_cert === "true") {
		// 		console.log('############ revoking atom certs %j ############', atomHostname);
		//
		// 		//validate pre-requisites
		// 		assert.isNotNull(atomHostname);
		// 		assert.isNotNull(atomDirPath);
		//
		// 		atomServices.revokeCert(atomHostname, function (error, payload) {
		//
		// 			console.log('############ revoke atom certs response received with payload %j and error %j ############', payload, error);
		//
		// 			//validate payload & error
		// 			assert.isNull(error, error && error.message);
		// 			assert.isNotNull(payload, error && error.message);
		//
		// 			done()
		//
		// 		});
		// 	}
		// 	else {
		// 		done()
		// 	}
		// });
		//
		// it('Should renew atom certs', function (done) {
		// 	if (options.run_cert === "true") {
		// 		console.log('############ renewing atom certs %j ############', atomHostname);
		//
		// 		//validate pre-requisites
		// 		assert.isNotNull(atomHostname);
		// 		assert.isNotNull(atomDirPath);
		//
		// 		atomServices.renewCert(atomHostname, function (error, payload) {
		//
		// 			console.log('############ renew atom certs response received with payload %j and error %j ############', payload, error);
		//
		// 			//validate payload & error
		// 			assert.isNull(error, error && error.message);
		// 			assert.isNotNull(payload, error && error.message);
		//
		// 			//validate certificate structure
		// 			var certsCreated = beameUtils.validateHostCertsSync(atomHostname, global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
		// 			assert.isTrue(certsCreated, 'Certificates mismatch');
		//
		// 			done()
		//
		// 		});
		// 	}
		// 	else {
		// 		done()
		// 	}
		//
		// });
		//
		// it('Should bring atom stats', function (done) {
		// 	if (options.run_stats === "true") {
		// 		console.log('############ bringing stats for atom  %j ############', atomHostname);
		//
		// 		//validate pre-requisites
		// 		assert.isNotNull(atomHostname);
		//
		// 		atomServices.getStats(atomHostname, function (error, payload) {
		//
		// 			if (!error) {
		// 				console.log('############ bring stats atom stats ############');
		// 				console.log(payload);
		// 			}
		// 			else {
		// 				console.log('############ bring stats atom stats error %j ############', error);
		// 			}
		//
		// 			//validate payload & error
		// 			assert.isNull(error, error && error.message);
		// 			assert.isNotNull(payload, error && error.message);
		//
		// 			done()
		//
		// 		});
		// 	}
		// 	else {
		// 		done()
		// 	}
		// });

	});

}

module.exports = {run};

