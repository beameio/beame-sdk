'use strict';

const config      = require('../../config/Config');
const module_name = config.AppModules.AuthToken;
const BeameLogger = require('../utils/Logger');
const logger      = new BeameLogger(module_name);
const CommonUtils = require('../utils/CommonUtils');
const BeameStore  = require('./BeameStoreV2');
const Credential  = require('./Credential');

const timeFuzz = 5;

class AuthToken {

	/**
	 * @param {Object|String} data
	 * @param {Credential}signingCreds
	 * @param {Number} ttl => seconds
	 * @returns {string | null}
	 */
	static create(data, signingCreds, ttl) {

		try {
			if (!(signingCreds instanceof Credential)) {
				logger.warn('signingCreds must be present and must be instance of Credential');
				return null;
			}

			const now   = Date.now();

			let data2sign = data ? (typeof data == "object" ? CommonUtils.stringify(data,false) : data) : null;

			/** @type {SignedData} */
			const token = {
				created_at: Math.round(now / 1000),
				valid_till: Math.round(now / 1000) + (ttl || 10),
				data:       data2sign
			};

			return CommonUtils.stringify(signingCreds ? signingCreds.sign(token) : token, false);

		}
		catch (error) {
			logger.error(BeameLogger.formatError(error));
			return null
		}

	}


	/**
	 *
	 * @param {SignatureToken|String} token
	 * @returns {SignatureToken|null}
	 */
	static validate(token) {
		/** @type {SignatureToken} */
		let authToken = CommonUtils.parse(token);

		if (!authToken) {
			logger.warn('Could not decode authToken JSON. authToken must be a valid JSON');
			return null;
		}

		if (!authToken.signedData) {
			logger.warn('authToken has no .signedData');
			return null;
		}
		if (!authToken.signedBy) {
			logger.warn('authToken has no .signedBy');
			return null;
		}
		if (!authToken.signature) {
			logger.warn('authToken has no .signature');
			return null;
		}

		const store       = new BeameStore();
		const signerCreds = store.getCredential(authToken.signedBy);

		if (!signerCreds) {
			logger.warn(`Signer (${authToken.signedBy}) credentials were not found`);
			return null;
		}

		const signatureStatus = signerCreds.checkSignature(authToken);
		if (!signatureStatus) {
			logger.warn(`Bad signature`);
			return null;
		}

		var signedData = CommonUtils.parse(authToken.signedData);
		if (!signedData) {
			logger.warn('Could not decode authToken.signedData JSON. authToken.signedData must be a valid JSON');
			return null;
		}

		const now = Math.round(Date.now() / 1000);

		if (signedData.created_at > now + timeFuzz) {
			logger.warn(`authToken.signedData.created_at is in future - invalid token or incorrect clock`);
			return null;
		}

		if (signedData.valid_till < now - timeFuzz) {
			logger.warn(`authToken.signedData.valid_till is in the past - token expired`);
			return null;
		}

		return authToken;
	}

}

module.exports = AuthToken;
