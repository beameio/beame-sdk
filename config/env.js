'use strict';

const BeameLogger = require('../src/utils/Logger');
const logger      = new BeameLogger("SdkEnv");
const config      = require('./Config');

module.exports = {
	Name: config.SelectedProfile.Name,
	LoadBalancerFqdn: config.SelectedProfile.LoadBalancerFqdn,
	OcspProxyFqdn: config.SelectedProfile.OcspProxyFqdn,

	get ExternalOcspFqdn() {
		return config.SelectedProfile.ExternalOcspFqdn;
	},
	set ExternalOcspFqdn(fqdn) {
		logger.info(`Setting ExternalOcspFqdn to ${fqdn}`);
		config.SelectedProfile.ExternalOcspFqdn = fqdn;
	},

	get ExternalOcspSigningFqdn() {
		return config.SelectedProfile.ExternalOcspSigningFqdn;
	},
	set ExternalOcspSigningFqdn(fqdn) {
		logger.info(`Setting ExternalOcspSigningFqdn to ${fqdn}`);
		config.SelectedProfile.ExternalOcspSigningFqdn = fqdn;
	},

	get OcspCachePeriod() {
		return config.SelectedProfile.OcspCachePeriod;
	},
	set OcspCachePeriod(ocspCachePeriod) {
		logger.info(`Setting OcspCachePeriod to ${ocspCachePeriod}`);
		config.SelectedProfile.OcspCachePeriod = ocspCachePeriod;
	},
};
