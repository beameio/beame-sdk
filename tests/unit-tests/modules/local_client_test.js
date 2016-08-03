/**
 * Created by zenit1 on 03/08/2016.
 */

var config = require('../test_config');
var options = config.options;
var assert = config.assert;
var beameUtils = config.beameUtils;
var localClientServices = config.localClientServices;
var dataServices = config.dataServices;
var globalConfig = require('../../../config/Config');

function run() {
	describe('Test Local Client flow', function () {
		this.timeout(1000000);

		var atomHostname, edgeClientHostname, localClientHostname, localClientDirPath;

		before(function (done) {

			console.log('####### receive edge_fqdn');

			atomHostname = process.env.atom_fqdn;

			assert.isDefined(atomHostname, 'Atom hostname required');
			assert.isNotNull(atomHostname, 'Atom hostname required');

			console.log(atomHostname);

			edgeClientHostname = process.env.edge_client_fqdn;

			assert.isDefined(edgeClientHostname, 'Atom hostname required');
			assert.isNotNull(edgeClientHostname, 'Atom hostname required');

			console.log('##### edge client fqdn',edgeClientHostname);


			done()
		});

		it('Should create local client', function (done) {

			console.log('############ creating local client: edge client is %j for atom %j ############', edgeClientHostname, atomHostname);

			beameUtils.getLocalActiveInterface(function(error,localIp){
				"use strict";

				assert.isNull(error, error && error.message);
				assert.isNotNull(localIp, error && error.message);

				if(localIp){
					localClientServices.createLocalClient(atomHostname, localIp, edgeClientHostname , function (error, payload) {

						console.log('############ create local client response received with payload %j and error %j ############', payload, error);

						//validate payload & error
						assert.isNull(error, error && error.message);
						assert.isNotNull(payload, error && error.message);

						//validate hostname
						localClientHostname = payload["hostname"];
						assert.isNotNull(localClientHostname, 'Edge hostname mismatch');


						//validate path
						localClientDirPath = beameUtils.findHostPathSync(localClientHostname);
						assert.isNotNull(localClientDirPath, `Edge ${localClientHostname} directory not found`);

						//validate certificate structure
						var certsCreated = dataServices.validateHostCertsSync(localClientHostname, globalConfig.ResponseKeys.NodeFiles, globalConfig.AppModules.UnitTest);
						assert.isTrue(certsCreated, `Certificates mismatch for edge ${localClientHostname}`);


						//validate metadata json
						var metadata = dataServices.getHostMetadataSync(localClientHostname);
						assert.isNotNull(metadata, 'Metadata mismatch');

						assert.equal(metadata["hostname"], localClientHostname, 'Metadata hostname is incorrect');


						done()
					}, true);
				}
				else{
					done()
				}

			});




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
}

module.exports = {run};