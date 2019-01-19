'use strict';

const changeCase = require('change-case');
const debug = require('debug')('beame:sdk:env');

function makeEnv(environments, options) {

	function getEnv() {
		if(opts.env) {
			return opts.env.toLowerCase();
		}
		if (process.env.BEAME_ENV) {
			return process.env.BEAME_ENV.toLowerCase();
		}
		return 'prod';
	}

	const opts = Object.assign({protectedProperties: []}, options || {});

	debug(`makeEnv.js: BEAME_ENV=${process.env.BEAME_ENV || '(UNSET)'}`);

	if(process.env.BEAME_ENV_PROFILE) {
		console.error(`Warning: ignoring environment variable BEAME_ENV_PROFILE. Please use BEAME_ENV`);
		process.exit(1);
	}

	const environment = environments[getEnv()];

	for(const k of Object.keys(environment)) {
		const envVarName = 'BEAME_' + changeCase.constantCase(k);
		if(opts.protectedProperties.includes(k)) {
			if(process.env[envVarName]) {
				console.warn(`Warning: ignoring environment variable ${envVarName}`);
			}
			continue;
		}
		if(process.env[envVarName]) {
			console.warn(`Warning: env: using environment setting override from environment variable ${envVarName} which has value ${process.env[envVarName]}`);
			environment[k] = process.env[envVarName];
		}
	}

	debug('makeEnv.js: environment=%j', environment);
	return environment;
}
module.exports = makeEnv;
