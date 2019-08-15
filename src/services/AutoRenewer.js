'use strict';

const config              = require('../../config/Config');
const logger              = new (require('../utils/Logger'))(config.AppModules.AutoRenewer);
const BeameStore          = require("./BeameStoreV2");
const store               = (BeameStore).getInstance();
const BeameUtils          = require('../utils/BeameUtils');

/**
 * Checks if a credential reached already the renewal period
 * @param cred - cred to check
 * @param date - date to consider for the expiration (default is now)
 * @returns {boolean} true: needs renewal, false otherwise
 */
function needsRenewal(cred, date = new Date()) {
	if(!cred.certData || !cred.certData.validity)
		return true;

	// calculate expiration before period from percentage and make sure it doesn't exceed the max period
	let calculatedBeforeExpiration = ((cred.certData.validity.end - cred.certData.validity.start) * (config.renewalPercentageBeforeExpiration / 100));
	if(calculatedBeforeExpiration > config.renewalBeforeExpirationMaxPeriod)
		calculatedBeforeExpiration = config.renewalBeforeExpirationMaxPeriod;

	return new Date(cred.certData.validity.end) < new Date(date + calculatedBeforeExpiration);
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
		const credId = { fqdn: cred.fqdn, validUntil: cred.getCertEnd() };
		try {
			if(!force && !needsRenewal(cred))
			{
				result.skipped.push(credId);
				logger.debug(`Renewal for ${credId.fqdn} was skipped (validUntil: ${credId.validUntil})`);
				continue;
			}

			await cred.renewCert(null, credId.fqdn);
			result.succeeded.push(credId);
			logger.debug(`Renewal for ${credId.fqdn} was successfully`);
		}
		catch (e) {
			result.failed.push(credId);
			logger.error(`Renewal for ${credId.fqdn} failed!`,e);
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