'use strict';

const config      = require('../../config/Config');
const module_name = config.AppModules.AuthToken;
const BeameLogger = require('../utils/Logger');
const logger      = new BeameLogger(module_name);
const CommonUtils = require('../utils/CommonUtils');
const BeameStore  = require('./BeameStoreV2');
const Credential  = require('./Credential');

const timeFuzz = config.defaultTimeFuzz;

class AuthToken {

	//noinspection JSUnusedGlobalSymbols
	static getRequestAuthToken(req) {
		return new Promise((resolve, reject) => {
				let authHead  = req.get('X-BeameAuthToken'),
				    /** @type {SignatureToken|null} */
				    authToken = null;

				logger.debug(`auth head received ${authHead}`);

				if (authHead) {
					try {
						authToken = CommonUtils.parse(authHead);

						if (!CommonUtils.isObject(authToken)) {
							logger.error(`invalid auth ${authToken} token format`);
							reject({message: 'Auth token invalid json format'});
							return;
						}
					}
					catch (error) {
						logger.error(`Parse auth header error ${BeameLogger.formatError(error)}`);
						reject({message: 'Auth token invalid json format'});
						return;
					}
				}

				if (!authToken) {
					reject({message: 'Auth token required'});
					return;
				}

				AuthToken.validate(authToken)
					.then(resolve)
					.catch(reject);
			}
		);
	}


	/**
	 * @param {Object|String} data
	 * @param {Credential}signingCreds
	 * @param {Number|null|undefined} [ttl] => seconds
	 * @returns {string | null}
	 */
	static create(data, signingCreds, ttl) {

		try {
			if (!(signingCreds instanceof Credential)) {
				logger.warn('signingCreds must be present and must be instance of Credential');
				return null;
			}

			const now = Date.now();

			let data2sign = data ? (typeof data == "object" ? CommonUtils.stringify(data, false) : data) : null;

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

	static createAsync(data, signingCreds, ttl){
		return new Promise((resolve, reject) => {

				CommonUtils.validateMachineClock().then(()=>{
					resolve(AuthToken.create(data,signingCreds,ttl))
				}).catch(reject);
			}
		);
	}

	/**
	 *
	 * @param {SignatureToken|String} token
	 * @returns {Promise.<SignatureToken|null>}
	 */
	static validate(token) {
		/** @type {SignatureToken} */


		return new Promise((resolve, reject) => {
			let authToken = CommonUtils.parse(token);

			if (!authToken) {
				logger.error('Could not decode authToken JSON. authToken must be a valid JSON');
				reject({message: 'Could not decode authToken JSON. authToken must be a valid JSON'});
				return;
			}

			if (!authToken.signedData) {
				logger.error('authToken has no .signedData');
				reject({message: 'authToken has no .signedData'});
				return;
			}
			if (!authToken.signedBy) {
				logger.error('authToken has no .signedBy');
				reject({message: 'authToken has no .signedBy'});
				return;
			}
			if (!authToken.signature) {
				logger.error('authToken has no .signature');
				reject({message: 'authToken has no .signature'});
				return;
			}

			const store = new BeameStore();

			store.find(authToken.signedBy).then(signerCreds => {
				const signatureStatus = signerCreds.checkSignature(authToken);
				if (!signatureStatus) {
					logger.error(`Bad signature`);
					reject({message: `Bad signature`});
					return;
				}

				let signedData = CommonUtils.parse(authToken.signedData);
				if (!signedData) {
					logger.error('Could not decode authToken.signedData JSON. authToken.signedData must be a valid JSON');
					reject({message: 'Could not decode authToken.signedData JSON. authToken.signedData must be a valid JSON'});
					return;
				}

				const now = Math.round(Date.now() / 1000);

				if (signedData.created_at - config.defaultAllowedClockDiff > now + timeFuzz) {
					logger.error(`authToken.signedData.created_at ${signedData.created_at} is in future - invalid token or incorrect clock`);
					reject({message: `authToken.signedData.created_at is in future - invalid token or incorrect clock`});
					return;
				}

				if (signedData.valid_till + config.defaultAllowedClockDiff < now - timeFuzz) {
					logger.error(`authToken.signedData.valid_till ${signedData.valid_till} is in the past - token expired`);
					reject({message: `authToken.signedData.valid_till is in the past - token expired`});
					return;
				}
				resolve(authToken);
			}).catch(reject);
		});
	}
}

module.exports = AuthToken;
