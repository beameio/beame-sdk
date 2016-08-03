/**
 * Created by zenit1 on 17/07/2016.
 */
var config       = require('../test_config');
var options      = config.options;
var assert       = config.assert;
var beameUtils   = config.beameUtils;
var edgeServices = config.edgeServices;
var dataServices = config.dataServices;
var globalConfig = require('../../../config/Config');
var localClientTest = require('./local_client_test');
var localClientsTest = require('./local_clients_test');

/**
 * CMD to run from console
 *  env edge_fqdn=[edge_fqdn] npm run test_edge
 **/

function run() {
	describe('Test Edge Client flow', function () {
		this.timeout(1000000);

		var atomHostname, edgeClientHostname, name, edgeClientDirPath;

		before(function (done) {

			console.log('####### receive edge_fqdn');

			atomHostname = process.env.atom_fqdn;

			assert.isDefined(atomHostname, 'Atom hostname required');
			assert.isNotNull(atomHostname, 'Atom hostname required');

			console.log(atomHostname);

			done()
		});

		it('Should create edge', function (done) {

			var rnd = beameUtils.randomString(8);
			name    = 'test-edge-' + rnd;

			console.log('############ creating edge %j for atom %j ############', name, atomHostname);


			edgeServices.createEdgeClient(atomHostname, function (error, payload) {

				console.log('############ create edge response received with payload %j and error %j ############', payload, error);

				//validate payload & error
				assert.isNull(error, error && error.message);
				assert.isNotNull(payload, error && error.message);

				//validate hostname
				edgeClientHostname = payload["hostname"];
				assert.isNotNull(edgeClientHostname, 'Edge hostname mismatch');
				process.env.edge_client_fqdn = edgeClientHostname;

				//validate path
				edgeClientDirPath = beameUtils.findHostPathSync(edgeClientHostname);
				assert.isNotNull(edgeClientDirPath, `Edge ${edgeClientHostname} directory not found`);

				//validate certificate structure
				var certsCreated = dataServices.validateHostCertsSync(edgeClientHostname, globalConfig.ResponseKeys.NodeFiles, globalConfig.AppModules.UnitTest);
				assert.isTrue(certsCreated, `Certificates mismatch for edge ${edgeClientHostname}`);


				//validate metadata json
				var metadata = dataServices.getHostMetadataSync(edgeClientHostname);
				assert.isNotNull(metadata, 'Metadata mismatch');

				assert.equal(metadata["hostname"], edgeClientHostname, 'Metadata hostname is incorrect');


				done()
			}, true);

		});
		//
		// it('Should revoke edge certs', function (done) {
		//
		// 	if (options.run_cert === "true") {
		// 		console.log('############ revoking edge certs %j ############', edgeClientHostname);
		//
		// 		//validate pre-requisites
		// 		assert.isNotNull(edgeClientHostname);
		// 		assert.isNotNull(edgeClientDirPath);
		//
		// 		edgeServices.revokeCert(edgeClientHostname, function (error, payload) {
		//
		// 			console.log('############ revoke edge certs response received with payload %j and error %j ############', payload, error);
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
		// it('Should renew edge certs', function (done) {
		//
		// 	if (options.run_cert === "true") {
		// 		console.log('############ renewing edge certs %j ############', edgeClientHostname);
		//
		// 		//validate pre-requisites
		// 		assert.isNotNull(edgeClientHostname);
		// 		assert.isNotNull(edgeClientDirPath);
		//
		// 		edgeServices.renewCert(edgeClientHostname, function (error, payload) {
		//
		// 			console.log('############ renew edge certs response received with payload %j and error %j ############', payload, error);
		//
		// 			//validate payload & error
		// 			assert.isNull(error, error && error.message);
		// 			assert.isNotNull(payload, error && error.message);
		//
		// 			//validate certificate structure
		// 			var certsCreated = beameUtils.validateHostCertsSync(edgeClientHostname, globalConfig.ResponseKeys.NodeFiles, globalConfig.AppModules.UnitTest);
		// 			assert.isTrue(certsCreated, 'Certificates mismatch');
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
		// it('Should bring edge stats', function (done) {
		//
		// 	if (options.run_stats === "true") {
		//
		// 		console.log('############ bringing stats for edge  %j ############', edgeClientHostname);
		//
		// 		//validate pre-requisites
		// 		assert.isNotNull(edgeClientHostname);
		//
		// 		edgeServices.getStats(edgeClientHostname, function (error, payload) {
		//
		// 			if (!error) {
		// 				console.log('############ bring stats edge stats ############');
		// 				console.log(payload);
		// 			}
		// 			else {
		// 				console.log('############ bring stats edge stats error %j ############', error);
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

	//describe('Testing local client',localClientsTest.run);

	describe('Testing local client',localClientTest.run);
}

module.exports = {run};
