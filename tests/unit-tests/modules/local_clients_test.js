/**
 * Created by zenit1 on 03/08/2016.
 */

var config = require('../test_config');
var assert = config.assert;
var localClientServices = config.localClientServices;


function run() {
	describe('Test Local Client flow', function () {
		this.timeout(1000000);

		var atomHostname, edgeClientHostname;

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

		it('Should create local clients', function (done) {

			console.log('############ creating local client: edg client is %j for atom %j ############', edgeClientHostname, atomHostname);

			localClientServices.createLocalClients(atomHostname, edgeClientHostname , function (error, payload) {

				console.log('############ create local client response received with payload %j and error %j ############', payload, error);

				//validate payload & error
				assert.isNull(error, error && error.message);
				assert.isNotNull(payload, error && error.message);

				done()
			}, true);

		});

	});
}

module.exports = {run};