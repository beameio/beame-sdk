const changeCase = require('change-case');
const debug = require('debug')('beame:sdk:env');

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

const protectedProperties = ['Name'];

debug(`config/env.js: BEAME_ENV=${process.env.BEAME_ENV || '(UNSET)'}`);

if(process.env.BEAME_ENV_PROFILE) {
	console.warn(`Warning: ignoring environment variable BEAME_ENV_PROFILE. Please use BEAME_ENV`);
}

/**
 *
 * @var { {Name, LoadBalancerFqdn, OcspProxyFqdn} }
 */
const environment = (process.env.BEAME_ENV && environments[process.env.BEAME_ENV.toLowerCase()]) || environments.prod;

for(const k of Object.keys(environment)) {
	const envVarName = 'BEAME_' + changeCase.constantCase(k);
	if (protectedProperties.includes(k)) {
		if(process.env[envVarName]) {
			console.warn(`Warning: ignoring environment variable ${envVarName}`);
		}
		continue;
	}
	if (process.env[envVarName]) {
		console.warn(`Warning: env: using environment setting override from environment variable ${envVarName} which has value ${process.env[envVarName]}`);
		environment[k] = process.env[envVarName];
	}
}

debug('config/env.js: environment=%j', environment);
module.exports = environment;
