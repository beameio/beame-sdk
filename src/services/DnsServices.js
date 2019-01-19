/**
 * Created by zenit1 on 29/12/2016.
 */
"use strict";

const ProvisionApi = require('../services/ProvisionApi');
const envProfile = require('../../config/Config').SelectedProfile;
const apiDnsActions = envProfile.Actions.DnsApi;
const BeameLogger = require('../utils/Logger');
const logger = new BeameLogger("DnsServices");

const Config = require('../../config/Config');
const debug_dns = require('debug')(Config.debug_prefix + 'dns');

const AuthToken = require('./AuthToken');
const provisionApi = new ProvisionApi();
const store = new (require('./BeameStoreV2'))();

async function _getToken(fqdn, value) {
	const cred = await store.find(fqdn, false);
	return await AuthToken.createAsync({fqdn, value}, cred);
}

async function setDns(fqdn, value, dnsFqdn) {
	debug_dns(`DnsServices.setDns() fqdn=${fqdn} value=${value} dnsFqdn=${dnsFqdn}`);
	const authToken = await _getToken(fqdn, value);
	const result = await provisionApi.postRequestAsync(`${envProfile.BaseDNSUrl}${apiDnsActions.Set.endpoint}${dnsFqdn || fqdn}`, {authToken});
	logger.info(`DNS update record for ${fqdn} requested`);
	debug_dns(`DnsServices.setDns() returns ${JSON.stringify(result)}`);
	return result;
}

async function deleteDns(fqdn, dnsFqdn) {
	debug_dns(`DnsServices.deleteDns() fqdn=${fqdn} dnsFqdn=${dnsFqdn}`);
	const authToken = await _getToken(fqdn, fqdn);
	const result = await provisionApi.postRequestAsync(`${envProfile.BaseDNSUrl}${apiDnsActions.Delete.endpoint}${dnsFqdn || fqdn}`, {authToken});
	logger.info(`DNS deleted record for ${fqdn} requested`);
	debug_dns(`DnsServices.debug_dns() returns ${JSON.stringify(result)}`);
	return result;
}

module.exports = {
	setDns,
	deleteDns
};
