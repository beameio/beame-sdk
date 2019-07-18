'use strict';

const config      = require('../../config/Config');
const module_name = config.AppModules.AuthToken;
const BeameLogger = require('../utils/Logger');
const logger      = new BeameLogger(module_name);
const CommonUtils = require('../utils/CommonUtils');
const BeameStore  = require('./BeameStoreV2');
const Credential  = require('./Credential');
const OcspStatus  = (require('../../config/Config')).OcspStatus;

const timeFuzz = config.defaultTimeFuzz;

class AuthToken {

	//noinspection JSUnusedGlobalSymbols
	static getRequestAuthToken(req, allowExpired = false, event = null) {
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

				AuthToken.validate(authToken, allowExpired, event)
					.then(resolve)
					.catch(reject);
			}
		);
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
			if (!(signingCreds instanceof Credential)) {
				logger.error('signingCreds must be present and must be instance of Credential');
				return null;
			}

			if (signingCreds.expired && !allowExpired) {
				logger.error(`signingCreds ${signingCreds.fqdn} expired`);
				return null;
			}

			if (signingCreds.revoked) {
				logger.error(`signingCreds ${signingCreds.fqdn} revoked`);
				return null;
			}

			if(!signingCreds.hasPrivateKey){
				logger.warn(`signingCreds ${signingCreds.fqdn} must have private key`);
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
	static validate(token, allowExpired = false, event = null) {

		const cdr_logger = require('../../src/utils/CDR').getInstance();

		/** @type {String} **/
		let cdr_event = event;

		return new Promise((resolve, reject) => {

			const _reject = (msg) => {
				logger.error(msg);
				if (cdr_event) {
					cdr_event["error"] = msg;
					cdr_event["token"] = token;
					cdr_logger.error(cdr_event);
				}

				reject({message: msg});
			};

			let authToken = CommonUtils.parse(token);

			if (!authToken) {
				return _reject('Could not decode authToken JSON. authToken must be a valid JSON');
			}

			if (!authToken.signedData) {
				return _reject('authToken has no .signedData');
			}
			if (!authToken.signedBy) {
				return _reject('authToken has no .signedBy');
			}
			if (!authToken.signature) {
				return _reject('authToken has no .signature');
			}

			const store       = new BeameStore();
		    if(cdr_event){
		    	cdr_event["fqdn"] = authToken.signedBy;
		    }

			store.find(authToken.signedBy, undefined, allowExpired).then(signerCreds => {
				signerCreds.checkOcspStatus(signerCreds)
					.then(status => {

						if (status === OcspStatus.Revoked) {
							return _reject(`OCSP status is Revoked`);
						}

						const signatureStatus = signerCreds.checkSignature(authToken);
						if (!signatureStatus) {
							return _reject(`Bad signature`);
						}

						let signedData = CommonUtils.parse(authToken.signedData);
						if (!signedData) {
							return _reject('Could not decode authToken.signedData JSON. authToken.signedData must be a valid JSON');
						}

						const now = Math.round(Date.now() / 1000);

						if (signedData.created_at - config.defaultAllowedClockDiff > now + timeFuzz) {
							return _reject(`authToken.signedData.created_at ${signedData.created_at} is in future - invalid token or incorrect clock`);
						}

						if (signedData.valid_till + config.defaultAllowedClockDiff < now - timeFuzz) {
							return _reject(`authToken.signedData.valid_till ${signedData.valid_till} is in the past - token expired`);
						}

						if(cdr_event){
							cdr_logger.info(cdr_event);
						}
						resolve(authToken);
					})
					.catch(reject)
			}).catch(reject);
		});
	}
}

module.exports = AuthToken;
