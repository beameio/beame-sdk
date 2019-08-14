'use strict';

const config              = require('../../config/Config');
const logger              = new (require('../utils/Logger'))(config.AppModules.AutoRenewer);
const BeameStore          = require("./BeameStoreV2");
const store               = (BeameStore).getInstance();

/**
 * Renews all needed certificates (if force, it will renew even if not needed)
 * @param {Boolean|null} force
 * @returns {Promise<{succeeded: [], failed: [], skipped: []}>}
 */
async function renewAll(force) {
	logger.debug(`RenewAll called with force = ${!!force}`);
	const result = { skipped: [], succeeded: [], failed: [] };
	for(const cred of store.list('.',  { hasPrivateKey: true, excludeRevoked: true }))
	{
		try {
			if(!force && cred.certData && cred.certData.validity &&
				new Date(cred.certData.validity.end) > new Date(Date.now() + config.renewalBeforeExpiration))
			{
				result['skipped'].push({fqdn: cred.fqdn, validUntil: cred.getCertEnd()});
				logger.debug(`Skipping cred ${cred.fqdn}`);
				continue;
			}

			await cred.renewCert(null, cred.fqdn);
			logger.debug(`Certificate for ${cred.fqdn} renewed successfully`);
			result['succeeded'].push({fqdn: cred.fqdn, validUntil: cred.getCertEnd()});
		}
		catch (e) {
			logger.error(`Unable to renew certificate ${cred.fqdn}`,e);
			result['failed'].push({fqdn: cred.fqdn, validUntil: cred.getCertEnd()});
		}
	}
	return result;
}

let _autorenew_timeout = null;
/**
 * Starts the credential auto renew as a background process
 */
function start() {
	function _runAutoRenew() {
		logger.info(`Running credential AutoRenew`);
		function _interval(f) {
			_autorenew_timeout = setTimeout(f, config.renewalCheckInterval);
			logger.info(`Scheduled next AutoRenew run for ${new Date() + config.renewalCheckInterval}`);
		}
		renewAll(false)
			.then(result => {
				logger.info(`AutoRenew completed. ${result.failed} failed, ${result.succeeded} succeeded, ${result.skipped} were skipped`);
				_interval(_runAutoRenew);
			})
			.catch(e => {
				logger.error("AutoRenew error!", e);
				_interval(_runAutoRenew);
			});
	}

	_runAutoRenew();
}

/**
 * Stops the credential auto renew background process (if existing)
 */
function stop() {
	if (_autorenew_timeout) {
		logger.info("Stopping credential AutoRenew");
		clearTimeout(_autorenew_timeout);
	}
}

module.exports = {
	renewAll,
	start,
	stop
};