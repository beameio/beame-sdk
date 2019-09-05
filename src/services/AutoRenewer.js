'use strict';

const config              = require('../../config/Config');
const logger              = new (require('../utils/Logger'))(config.AppModules.AutoRenewer);
const BeameStore          = require("./BeameStoreV2");
const store               = (BeameStore).getInstance();
const BeameUtils          = require('../utils/BeameUtils');

/**
 * Checks if a credential reached already the renewal period
 * @param cred {Credential} - credential to check
 * @param date {Date} - date to consider for the expiration (default is now)
 * @returns {boolean} true: needs renewal, false otherwise
 */
function needsRenewal(cred, date = new Date()) {
	if(!cred.certData || !cred.certData.validity)
		return true;

	// calculate renewal period from percentage and make sure it doesn't exceed the max period
	let renewalPeriod = ((cred.certData.validity.end - cred.certData.validity.start) * (config.renewalPercentageBeforeExpiration / 100));
	if(renewalPeriod > config.renewalBeforeExpirationMaxPeriod)
		renewalPeriod = config.renewalBeforeExpirationMaxPeriod;

	return new Date(cred.certData.validity.end - renewalPeriod) < date;
}

/**
 * Renews all needed certificates
 * @param force - if given, all credentials will be renewed even if still valid
 * @returns {Promise<{succeeded: [], failed: [], skipped: []}>}
 */
async function renewAll(force) {
	logger.debug(`RenewAll called with force = ${!!force}`);
	const result = { skipped: [], succeeded: [], failed: [] };
	for(const cred of store.list('.',  { hasPrivateKey: true, excludeRevoked: true }))
	{
		const credInfo = { fqdn: cred.fqdn, validUntil: cred.getCertEnd() };
		try {
			if(!force && !needsRenewal(cred))
			{
				result.skipped.push(credInfo);
				logger.debug(`Renewal for ${credInfo.fqdn} was skipped (validUntil: ${credInfo.validUntil})`);
				continue;
			}

			await cred.renewCert(null, credInfo.fqdn);
			result.succeeded.push(credInfo);
			logger.debug(`Renewal for ${credInfo.fqdn} was successfully`);
		}
		catch (e) {
			result.failed.push(credInfo);
			logger.error(`Renewal for ${credInfo.fqdn} failed!`,e);
		}
	}
	return result;
}

//region Background job
let _autorenewal_job = "Renew_Credentials";
/**
 * Starts the credential auto renew as a background process
 */
function start() {
	BeameUtils.startBackgroundJob(_autorenewal_job, renewAll, config.renewalCheckInterval);
}
/**
 * Stops the credential auto renew background process (if existing)
 */
function stop() {
	BeameUtils.stopBackgroundJob(_autorenewal_job);
}
//endregion

module.exports = {
	renewAll,
	start,
	stop
};
