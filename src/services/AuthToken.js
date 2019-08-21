'use strict';

const config      = require('../../config/Config');
const module_name = config.AppModules.AuthToken;
const BeameLogger = require('../utils/Logger');
const logger      = new BeameLogger(module_name);
const CommonUtils = require('../utils/CommonUtils');
const BeameStore  = require('./BeameStoreV2');
const Credential  = require('./Credential');
const OcspStatus  = (require('../../config/Config')).OcspStatus;
const assert      = require('assert').strict;

const timeFuzz = config.defaultTimeFuzz;

class AuthToken {

	//noinspection JSUnusedGlobalSymbols
	static async getRequestAuthToken(req, allowExpired = false, event = null) {
		let authHead  = req.get('X-BeameAuthToken');
		assert(authHead, 'Auth Header not received!');
		logger.debug(`Auth Header received '${authHead}'`);

		/** @type {SignatureToken|null} */
		let authToken = CommonUtils.parse(authHead);

		assert(authToken, 'Auth Header is not valid or was not parsed successfully');
		assert(authToken.signature && authToken.signedBy && authToken.signedData, 'Auth Header is not a valid SignatureToken');
		return await AuthToken.validate(authToken, allowExpired, event);
	}


	/**
	 * @param {Object|String} data
	 * @param {Credential}signingCreds
	 * @param {Number|null|undefined} [ttl] => seconds
	 * @param {boolean} allowExpired
	 * @returns {string | null}
	 */
	static create(data, signingCreds, ttl, allowExpired = false) {

		try {
			assert(signingCreds instanceof Credential, 'signingCreds must be present and must be instance of Credential');
			assert(!signingCreds.expired || allowExpired, `signingCreds ${signingCreds.fqdn} expired`);
			assert(!signingCreds.revoked, `signingCreds ${signingCreds.fqdn} revoked`);
			assert(signingCreds.hasPrivateKey, `signingCreds ${signingCreds.fqdn} must have private key`);

			const now = Date.now();
			const data2sign = data ? (typeof data == "object" ? CommonUtils.stringify(data, false) : data) : null;

			/** @type {SignedData} */
			const token = {
				created_at: Math.round(now / 1000),
				valid_till: Math.round(now / 1000) + (ttl || config.defaultAuthTokenTtl),
				data:       data2sign
			};

			return CommonUtils.stringify(signingCreds ? signingCreds.sign(token) : token, false);
		}
		catch (error) {
			logger.error(BeameLogger.formatError(error));
			return null
		}
	}

	static createAsync(data, signingCreds, ttl) {
		return new Promise((resolve, reject) => {

				CommonUtils.validateMachineClock()
					.then(signingCreds.checkOcspStatus.bind(signingCreds, signingCreds))
					.then(status => {
						status != OcspStatus.Revoked ? resolve(AuthToken.create(data, signingCreds, ttl)) : reject(`OCSP status of ${signingCreds.fqdn} is Revoked`)
					}).catch(reject);
			}
		);
	}

	/**
	 *
	 * @param {SignatureToken|String} token
	 * @param {undefined|Boolean} [allowExpired]
	 * @param {Object|undefined} [event]
	 * @returns {Promise.<SignatureToken|null>}
	 */
	static async validate(token, allowExpired = false, event = null) {
		const cdr_logger = require('../../src/utils/CDR').getInstance();

		try {
			let authToken = CommonUtils.parse(token);
			assert(authToken, 'Could not decode authToken JSON. authToken must be a valid JSON');
			assert(authToken.signedData, 'authToken has no .signedData');
			assert(authToken.signedBy, 'authToken has no .signedBy');
			assert(authToken.signature, 'authToken has no .signature');

			const store = new BeameStore();
			if(event) {
				event["fqdn"] = authToken.signedBy;
			}

			const signerCreds = await store.find(authToken.signedBy, undefined, allowExpired);
			const status = await signerCreds.checkOcspStatus(signerCreds);
			assert(status !== OcspStatus.Revoked, `OCSP status is Revoked`);

			const signatureStatus = signerCreds.checkSignature(authToken);
			assert(signatureStatus, `Bad signature`);

			let signedData = CommonUtils.parse(authToken.signedData);
			assert(signedData, 'Could not decode authToken.signedData JSON. authToken.signedData must be a valid JSON');

			const now = Math.round(Date.now() / 1000);
			assert(signedData.created_at - config.defaultAllowedClockDiff < now + timeFuzz, `authToken.signedData.created_at ${signedData.created_at} is in future - invalid token or incorrect clock`);
			assert(signedData.valid_till + config.defaultAllowedClockDiff > now - timeFuzz, `authToken.signedData.valid_till ${signedData.valid_till} is in the past - token expired`);

			if(event) {
				cdr_logger.info(event);
			}
			return authToken;
		}
		catch (e) {
			logger.error("AuthToken validation error: ", e);
			if(event) {
				event["error"] = e.message;
				event["token"] = token;
				cdr_logger.error(event);
			}
			throw e;
		}
	}
}

module.exports = AuthToken;
