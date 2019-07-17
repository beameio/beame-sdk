"use strict";

const Datastore         = require('nedb');
const path              = require('path');
const async             = require('async');
const Config            = require('../../config/Config');
const OcspStatus        = Config.OcspStatus;
const DirectoryServices = require('./DirectoryServices');
const CommonUtils       = require('../utils/CommonUtils');
const BeameLogger       = require('../utils/Logger');
const logger            = new BeameLogger("StoreCacheServices");

/**
 * @typedef {Object} SCSOptions
 * @property {String|undefined} [scs_path]
 * @property {Number|undefined} [cache_period]
 * @property {Number|undefined} [ocsp_interval]
 * @property {Number|undefined} [renewal_interval]
 **/

/**
 * @typedef {Object} CredDoc
 * @property {String} sha256Fingerprint
 * @property {String} fqdn
 * @property {Number|null} [notBefore]
 * @property {Number|null} [notAfter]
 * @property {Boolean} hasPrivateKey
 * @property {Boolean} revoked
 * @property {Boolean} expired
 * @property {Number|null} [lastOcspCheck]
 * @property {Number|null} [nextOcspCheck]
 * @property {Number|null} [lastLoginDate]
 * @property {OcspStatus} ocspStatus
 */

let _storeCacheServices      = null;
const ASYNC_EACH_LIMIT       = 100;
const DB_COMPACTION_INTERVAL = 1000 * 60 * 60;

const CredsCollectionName = 'ocsp';

const Collections = {
	creds: {
		name:    CredsCollectionName,
		indices: [
			{
				fieldName: 'sha256Fingerprint',
				unique:    true
			}, {
				fieldName: 'fqdn',
				unique:    false
			}, {
				fieldName: 'notAfter',
				unique:    false
			}, {
				fieldName: 'nextOcspCheck',
				unique:    false
			}, {
				fieldName: 'ocspStatus',
				unique:    false
			}
		]
	}
};

function nop() {
}

class StoreCacheServices {

	/**
	 * @param {SCSOptions} options
	 */
	constructor(options) {
		/** @type {SCSOptions} **/
		this._options = options;
		this._db = {};
		this._initDb();
		this._renewal_timeout = null;

	}

	load() {
		return new Promise((resolve) => {
				const store = (require('./BeameStoreV2')).getInstance();

			logger.info(`loading ${store.Credentials.length} creds to cache from store`);

				Promise.all(store.Credentials.map(cred => {
						return this.insertCredFromStore(cred)
					}
				)).then(() => {
					logger.info(`Cache loaded from store`);
					resolve();
				});
			}
		);
	}

	startScheduledRoutines() {

		logger.info(`Starting service`);
		this._db[CredsCollectionName].persistence.setAutocompactionInterval(DB_COMPACTION_INTERVAL);
		this._startRenewalRoutine();

	}

	stop() {
		if (this._renewal_timeout) {
			clearTimeout(this._renewal_timeout);
		}
	}

	//region ocsp and renewal routines


	/**
	 *
	 * @private
	 */
	_startRenewalRoutine() {

		let _setInterval = f => {
			this._renewal_timeout = setTimeout(f, this._options.renewal_interval);
		}, _runRoutine   = () => {
			this.renewState().then(() => {
				logger.info(`Renewal completed. Schedule next`);
				_setInterval(_runRoutine);
			}).catch(_setInterval.bind(this, _runRoutine));
		};
		_runRoutine();

	}

	/**
	 *
	 * @param {BeameStoreV2} store
	 * @param {String} fqdn
	 * @returns {Credential|null}
	 * @private
	 */
	_findCredential(store, fqdn) {

		return new Promise((resolve, reject) => {
				let _cred = store.getCredential(fqdn);
				if (_cred == null) {
					const _reject = () => {
						reject(`Credential ${fqdn} not found`);
					};
					//Credential not in store
					this._removeDoc(CredsCollectionName, {fqdn: fqdn}).then(_reject).catch(_reject);
				}

				resolve(_cred);
			}
		);


	}



	/**
	 *
	 * @param {String} sha256Fingerprint
	 * @param {Function|undefined} [cb]
	 * @private
	 */
	_doRenewal(sha256Fingerprint, cb = nop) {
		let doc = this.get(sha256Fingerprint);
		let cred = new (require('./Credential'))((require('./BeameStoreV2')).getInstance());
		cred.renewCert(null, doc.fqdn).then(() => {
			logger.info(`Certificates for ${sha256Fingerprint} (${doc.fqdn}) renewed successfully`);
			cb()
		}).catch(e => {

			const _returnError = () => {
				logger.error(`Renew cert for ${sha256Fingerprint} (${doc.fqdn}) error ${BeameLogger.formatError(e)}`);
				cb(e)
			};

			if (typeof e == 'object' && e.hasOwnProperty('code') && e['code'] === Config.MessageCodes.SignerNotFound) {
				this._updateAutoRenewFlag(sha256Fingerprint, false).then(_returnError).catch(_returnError)
			}
			else {
				_returnError();
			}

		})
	}

	/**
	 *
	 * @param sha256Fingerprint
	 * @param autoRenew
	 * @returns {Promise}
	 * @private
	 */
	_updateAutoRenewFlag(sha256Fingerprint, autoRenew) {
		return new Promise((resolve) => {
				try {
					let query  = {sha256Fingerprint: sha256Fingerprint},
					    update = {
						    $set: {
							    autoRenew: autoRenew
						    }
					    };

					this._updateDoc(CredsCollectionName, query, update)
						.then(resolve)
						.catch(e => {
							logger.error(`Update cache revocation for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
							resolve();
						});
				} catch (e) {
					logger.error(`Save cache revocation for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
				}
			}
		);

	}

	//endregion

	//region init DB
	/**
	 *
	 * @private
	 */
	_initDb() {
		DirectoryServices.createDir(Config.rootDir);
		DirectoryServices.createDir(this._options.scs_path);
		this._loadCollection(Collections.creds);
	}

	/**
	 *
	 * @param {Object}collection
	 * @private
	 */
	_loadCollection(collection) {

		try {

			let options = {
				filename:      path.join(this._options.scs_path, `${collection.name}.db`),
				autoload:      true,
				timestampData: true
			};

			this._db[collection.name] = new Datastore(options);
			this._db[collection.name].persistence.compactDatafile();

			collection.indices.forEach((index) => {
				this._addIndex(collection.name, index);
			});


		} catch (e) {
			logger.error(`Load collection ${collection.name} error ${BeameLogger.formatError(e)}`);
		}

	}

	/**
	 *
	 * @param {String} name
	 * @param {Object} index
	 * @private
	 */
	_addIndex(name, index) {
		this._db[name].ensureIndex(index)
	}

	//endregion

	//region db access operations
	/**
	 *
	 * @param collection
	 * @param query
	 * @returns {Promise}
	 * @private
	 */
	_findDoc(collection, query) {
		return new Promise((resolve, reject) => {
				this._db[collection]
					.findOne(query, (err, doc) => {
						if (err) {
							reject(err)
						}
						else {
							resolve(doc)
						}
					})
			}
		);
	}

	/**
	 *
	 * @param collection
	 * @param query
	 * @param sort
	 * @returns {Promise}
	 * @private
	 */
	_findDocs(collection, query = {}, sort = {}) {
		return new Promise((resolve, reject) => {
				this._db[collection].find(query).sort(sort).exec((err, docs) => {
					if (err) {
						reject(err)
					}
					else {
						resolve(docs)
					}
				})
			}
		);
	}

	/**
	 *
	 * @param collection
	 * @param doc
	 * @returns {Promise}
	 * @private
	 */
	_insertDoc(collection, doc) {
		return new Promise((resolve, reject) => {

				logger.debug(`Inserting ${JSON.stringify(doc)} into ${collection}`);
				this._db[collection]
					.insert(doc, (err, newDoc) => {
						if (err) {
							reject(err)
						}
						else {
							logger.debug(`Doc ${JSON.stringify(doc)} inserted into ${collection}`);
							resolve(newDoc)
						}
					})
			}
		);
	}

	/**
	 *
	 * @param collection
	 * @param query
	 * @param update
	 * @param options
	 * @returns {Promise}
	 * @private
	 */
	_updateDoc(collection, query, update, options = {}) {
		return new Promise((resolve, reject) => {
				this._db[collection].update(query, update, options, (err, numReplaced, returnUpdatedDocs) => {
					if (err) {
						reject(err)
					} else {
						resolve(returnUpdatedDocs);
					}
				});
			}
		);
	}

	/**
	 *
	 * @param collection
	 * @param query
	 * @param options
	 * @returns {Promise}
	 * @private
	 */
	_removeDoc(collection, query, options = {}) {
		return new Promise((resolve, reject) => {
				this._db[collection].remove(query, options, (err, numRemoved) => {
					if (err) {
						reject(err || `Unexpected error`)
					} else {
						logger.info(`${numRemoved} records removed from ${collection}`);
						resolve()
					}
				});
			}
		);
	}

	//endregion


	//region public methods
	/**
	 * @param {Credential} cred
	 * @param {String|undefined} [status]
	 */
	async insertCredFromStore(cred, status = null) {
		const credSha256Fingerprint = cred && cred.certData && cred.certData.fingerprints && cred.certData.fingerprints.sha256;
		if(!credSha256Fingerprint) return;

		const insertCred = async () => {
			if (!cred.hasKey("X509")) return;

			let ocspStatus    = status || Config.OcspStatus.Unknown,
				lastOcspCheck = null,
				validity      = cred.certData.validity || {start: null, end: null},
				revoked       = !!cred.metadata.revoked;

			if (cred.metadata.ocspStatus) {
				ocspStatus    = revoked ? Config.OcspStatus.Bad : Config.OcspStatus.Good;
				lastOcspCheck = CommonUtils.tryParseDate(cred.metadata.ocspStatus.date);
			}

			let doc = {
				sha256Fingerprint: credSha256Fingerprint,
				fqdn:          cred.fqdn,
				notBefore:     CommonUtils.tryParseDate(validity.start),
				notAfter:      CommonUtils.tryParseDate(validity.end),
				hasPrivateKey: cred.hasKey("PRIVATE_KEY"),
				revoked:       revoked,
				expired:       cred.expired,
				lastOcspCheck: lastOcspCheck,
				nextOcspCheck: null,
				lastLoginDate: null,
				ocspStatus:    ocspStatus,
				autoRenew:     true
			};

			await this._insertDoc(CredsCollectionName, doc);
		};

		try {
			const doc = await this._findDoc(CredsCollectionName, {sha256Fingerprint: credSha256Fingerprint});
			if (!doc) await insertCred()
		}
		catch (e) {
			logger.error(`find credential ${credSha256Fingerprint} (${cred.fqdn}) error ${BeameLogger.formatError(e)}`);
		}
	}

	/**
	 *
	 * @param {String} sha256Fingerprint
	 * @param {Object} certData
	 * @returns {Promise}
	 */
	async updateCertData(sha256Fingerprint, certData) {
		try {
			let query  = {sha256Fingerprint: sha256Fingerprint},
				start  = CommonUtils.tryParseDate(certData.validity.start),
				end    = CommonUtils.tryParseDate(certData.validity.end),
				update = {
					$set: {
						notBefore: start,
						notAfter:  end
					}
				};

			if (end) {
				update.$set["expired"] = new Date() > end;
			}

			await this._updateDoc(CredsCollectionName, query, update);

		} catch (e) {
			logger.error(`Update cert data for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
		}
	}

	saveRevocation(sha256Fingerprint) {
		return new Promise((resolve) => {
				try {
					let query  = {sha256Fingerprint: sha256Fingerprint},
					    update = {
						    $set: {
							    revoked:       true,
							    ocspStatus:    Config.OcspStatus.Bad,
							    nextOcspCheck: null
						    }
					    };

					this._updateDoc(CredsCollectionName, query, update)
						.then(resolve)
						.catch(e => {
							logger.error(`Update cache revocation for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
							resolve();
						});
				} catch (e) {
					logger.error(`Save cache revocation for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
					resolve();
				}
			}
		);

	}

	list(predicate) {
		return this._findDocs(CredsCollectionName, predicate);
	}

	get(sha256Fingerprint) {
		return this._findDoc(CredsCollectionName, {sha256Fingerprint});
	}

	setOcspStatus(sha256Fingerprint, status) {

		return new Promise((resolve) => {
				try {
					let query  = {sha256Fingerprint},
					    update = {
						    $set: {
							    ocspStatus:    status,
							    lastOcspCheck: new Date()
						    }
					    };

					switch (status) {
						case OcspStatus.Bad:
							update.$set["revoked"]       = true;
							update.$set["nextOcspCheck"] = null;
							break;
						case OcspStatus.Good:
							update.$set["revoked"]       = false;
							update.$set["nextOcspCheck"] = new Date(Date.now() + (this._options.cache_period - this._options.ocsp_interval));
							break;
						default:
							break;
					}


					this._updateDoc(CredsCollectionName, query, update)
						.then(resolve)
						.catch(e => {
							logger.error(`Update ocsp status for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
							resolve();
						});
				} catch (e) {
					logger.error(`Set ocsp status for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
					resolve()
				}
			}
		);
	}

	async getOcspStatus(sha256Fingerprint) {
		const doc = await this.get(sha256Fingerprint);
		if(!doc) {
			return OcspStatus.Unknown;
		}
		return doc.ocspStatus;
	}

	setLastLogin(sha256Fingerprint, date) {

		return new Promise((resolve) => {
				try {
					let query  = {sha256Fingerprint: sha256Fingerprint},
					    update = {
						    $set: {
							    lastLoginDate: CommonUtils.tryParseDate(date)
						    }
					    };

					this._updateDoc(CredsCollectionName, query, update)
						.then(resolve)
						.catch(e => {
							logger.error(`Update last login for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
							resolve();
						});
				} catch (e) {
					logger.error(`Set last login for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
					resolve();
				}
			}
		);
	}

	getLastLogin(sha256Fingerprint) {
		return new Promise((resolve, reject) => {
				this.get(sha256Fingerprint).then(doc => {
					doc ? resolve(doc.lastLoginDate) : reject(`Doc ${sha256Fingerprint} not found`)
				}).catch(e => {
					logger.error(`Get lastLogin for ${sha256Fingerprint} error ${BeameLogger.formatError(e)}`);
					reject(e);
				});
			}
		);

	}



	/**
	 *
	 * @param {Boolean|undefined} [force] => force update all
	 * @returns {Promise}
	 */
	renewState(force = false) {
		return new Promise((resolve) => {
				let query     = {
					    ocspStatus: {$ne: OcspStatus.Bad},
					    $and:       [{hasPrivateKey: true, autoRenew: true}]
				    };

				if (!force) {
					query["$and"].push({notAfter: {$lte: new Date(Date.now() + this._options.renewal_interval)}});
				}

				this._findDocs(CredsCollectionName, query).then(docs => {
					let idx = 0, updated = 0;
					// noinspection JSUnresolvedFunction
					async.eachLimit(docs, ASYNC_EACH_LIMIT, (doc, callback) => {
						idx++;
						setTimeout(() => {
							this._doRenewal(doc.sha256Fingerprint, (err) => {
								if (!err) {
									updated++;
								}

								callback()
							})
						}, idx * 1000)
					}, () => {
						resolve(`${idx} renewal requested, ${updated} completed`);
					});

				}).catch(e => {
					logger.error(`Find creds for Renew error::${BeameLogger.formatError(e)}. Routine not started!!!`);
					resolve(`Unexpected error ${BeameLogger.formatError(e)}`)
				})
			}
		);
	}

	//endregion


}

module.exports = {
	/**
	 * @param {SCSOptions|undefined} [_options]
	 */
	init: function (_options) {
		/** @type {SCSOptions} **/
		let _default_options = {
			scs_path:         Config.scsDir,
			cache_period:     Config.ocspCachePeriod,
			ocsp_interval:    Config.ocspCheckInterval,
			renewal_interval: Config.renewalCheckInterval
		};

		let options = Object.assign({}, _default_options, _options);

		_storeCacheServices = new StoreCacheServices(options);
	},

	getInstance: function () {

		if (_storeCacheServices == null) {
			this.init();
		}

		return _storeCacheServices;
	}
};
