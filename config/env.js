'use strict';

const environments = {
	dev: {
		Name: 'Dev',
		LoadBalancerFqdn: 'may129m153e6emrn.bqnp2d2beqol13qn.v1.d.beameio.net',
		OcspProxyFqdn: 'i6zirg0jsrzrk3dk.mpk3nobb568nycf5.v1.d.beameio.net',
	},

	prod: {
		Name: 'Prod',
		LoadBalancerFqdn: 'ioigl3wzx6lajrx6.tl5h1ipgobrdqsj6.v1.p.beameio.net',
		OcspProxyFqdn: 'iep9bs1p7cj3cmit.tl5h1ipgobrdqsj6.v1.p.beameio.net',
	},
};

module.exports = require('../src/utils/makeEnv')(environments, {protectedProperties: ['Name']});
