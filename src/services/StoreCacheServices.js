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

let _storeCacheServices = null;
const nop               = () => {
};
const OCSP_SLEEP        = 1000;
const ASYNC_EACH_LIMIT  = 100;

const Collections = {
	creds: {
		name:    'creds',
		indices: [
			{
				fieldName: 'fqdn',
				unique:    true
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

const CredsCollectionName = Collections.creds.name;

class StoreCacheServices {

	/**
	 * @param {SCSOptions} options
	 */
	constructor(options) {
		/** @type {SCSOptions} **/
		this._options = options;
		this._datFilePath      = path.join(this._options.scs_path, `scs._dat`);
		this._db               = {};
		this._dir_checksum     = null;
		this._initDb();

	}

	load() {

		return new Promise((resolve) => {
				let updateCache = true;

				const dirsum = require('dirsum');
				dirsum.digest(Config.localCertsDirV2, 'sha256', (err, hashes) => {
					if (!err && hashes.hash) {
						let checksum = this.storeState;
						if (checksum == hashes.hash) {
							updateCache = false;
						}
						else {
							this._dir_checksum = hashes.hash;
						}
					}

					const store = (require('./BeameStoreV2')).getInstance();

					if (!updateCache) {
						store.credArray = [];
						resolve();
						return;
					}

					logger.info(`Begin db updating`);

					let cred_to_insert = store.credArray;

					logger.info(`inserting total ${cred_to_insert.length} creds to cache from store`);

					Promise.all(cred_to_insert.map(cred => {
							return new Promise((resolve) => {
									this.insertCredFromStore(cred, resolve)
								}
							);
						}
					)).then(() => {
						store.credArray = [];
						logger.info(`Cache loaded from store`);
						resolve();
					});

				});
			}
		);
	}

	start() {

		logger.info(`Starting service`);

		this._startOcspHandlerRoutine();
		this._startRenewalRoutine();

		if (this._dir_checksum) {
			this.storeState = this._dir_checksum;
		}
	}

	stop() {
		if (this._ocsp_timeout) clearTimeout(this._ocsp_timeout);
		if (this._renewal_timeout) clearTimeout(this._renewal_timeout);
	}

	//region ocsp and renewal routines
	/**
	 *
	 * @private
	 */
	_startOcspHandlerRoutine() {

		const _ = () => {

			let sleep = OCSP_SLEEP,
			    nextCheck =  new Date(Date.now() + this._options.ocsp_interval),
			    query = {
				    ocspStatus: {$ne: OcspStatus.Bad},
				    $and:       [
					    {
						    $or: [
							    {nextOcspCheck: null},
							    {nextOcspCheck: {$lte: nextCheck}}
						    ]
					    }
				    ]
			    };

			this._findDocs(CredsCollectionName, query).then(docs => {
				const store = (require('./BeameStoreV2')).getInstance();
				// noinspection JSUnresolvedFunction
				async.eachLimit(docs, ASYNC_EACH_LIMIT, (doc) => {
					let cred = this._findCredential(store, doc.fqdn);
					if (cred) {
						this._doOcspCheck(cred, sleep)
					}
				});

			}).catch(e => {
				logger.error(`!!!!!!!!!!!!!!!!!IMPORTANT!!!!!!!!!!!!!!!!! Find creds for OCSP periodically check error::${BeameLogger.formatError(e)}. Routine not started!!!`)
			})

		};


		let doStuff = () => {
			_();
			this._ocsp_timeout = setTimeout(doStuff, this._options.ocsp_interval);
			this._ocsp_timeout.unref();
		};
		doStuff();

	}

	/**
	 *
	 * @private
	 */
	_startRenewalRoutine() {

		const _ = () => {

			let nextCheck =  new Date(Date.now() + this._options.renewal_interval),
				query = {
				ocspStatus: {$ne: OcspStatus.Bad},
				$and:       [
					{
						notAfter: {$lte:nextCheck}
					},
					{
						hasPrivateKey: true
					}
				]
			};

			this._findDocs(CredsCollectionName, query).then(docs => {
				const store = (require('./BeameStoreV2')).getInstance();
				// noinspection JSUnresolvedFunction
				async.eachLimit(docs, ASYNC_EACH_LIMIT, (doc) => {
					let cred = this._findCredential(store, doc.fqdn);
					if (cred) {
						this._doRenewal(cred)
					}
				});

			}).catch(e => {
				logger.error(`!!!!!!!!!!!!!!!!!IMPORTANT!!!!!!!!!!!!!!!!! Find creds for OCSP periodically check error::${BeameLogger.formatError(e)}. Routine not started!!!`)
			})

		};

		let doStuff = () => {
			_();
			this._renewal_timeout = setTimeout(doStuff, this._options.renewal_interval);
			this._renewal_timeout.unref();
		};
		doStuff();

	}

	/**
	 *
	 * @param {BeameStoreV2} store
	 * @param {String} fqdn
	 * @returns {Credential|null}
	 * @private
	 */
	_findCredential(store, fqdn) {
		let _cred = store.getCredential(fqdn);
		if (_cred == null) {
			//Credential not in store
			this._removeDocSync(CredsCollectionName, {fqdn: fqdn});
			return null;
		}

		return _cred;
	}

	/**
	 * @param {Number} sleep
	 * @param {Credential} cred
	 * @private
	 */
	_doOcspCheck(cred, sleep) {

		const _onOcspUnavailable = () => {
			sleep = parseInt(sleep * (Math.random() + 1.5));

			let ocspTimeout = setTimeout(() => {
				this._doOcspCheck.bind(this, cred, sleep);
			}, sleep);

			ocspTimeout.unref();
		};

		cred.doOcspRequest(cred).then(status => {
			if (status === OcspStatus.Unavailable) {
				_onOcspUnavailable()
			} else {
				logger.info(`Ocsp status of ${cred.fqdn} is ${status}`);
				this.setOcspStatus(cred.fqdn, status);
			}
		})

	}

	/**
	 *
	 * @param {Credential} cred
	 * @private
	 */
	_doRenewal(cred) {
		cred.renewCert(null, cred.fqdn).then(() => {
			logger.info(`Certificates for ${cred.fqdn} renewed successfully`)
		}).catch(e => {
			logger.error(`Renew cert for ${cred.fqdn} error ${BeameLogger.formatError(e)}`)
		})
	}

	//endregion

	//region init DB
	/**
	 *
	 * @private
	 */
	_initDb() {
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
	 * @param {Array} index
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
	 * @param collection
	 * @param query
	 * @param cb
	 * @private
	 */
	_findDocSync(collection, query, cb) {

		this._db[collection]
			.findOne(query, (err, doc) => {
				if (err) {
					cb(err)
				}
				else {
					cb(null, doc)
				}
			})

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
	 * @param {String} collection
	 * @param {Object} doc
	 * @param {Function|undefined} [cb]
	 * @private
	 */
	_insertDocSync(collection, doc, cb) {


		logger.debug(`Inserting ${JSON.stringify(doc)} into ${collection}`);
		this._db[collection]
			.insert(doc, (err) => {
				if (err) {
					logger.error(`Insert doc error ${BeameLogger.formatError(err)}`);
					cb && cb(err)
				}
				else {
					logger.debug(`Doc ${JSON.stringify(doc)} inserted into ${collection}`);
					cb && cb(null, doc)
				}
			})
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
				try {
					this._db[collection].update(query, update, options, (err, numReplaced, returnUpdatedDocs) => {
						if (err) {
							reject(err)
						} else {
							this._db[collection].persistence.compactDatafile();
							resolve(returnUpdatedDocs);
						}
					});
				} catch (e) {
					console.log(e)
				}
			}
		);
	}

	_updateDocSync(collection, query, update, options = {}, cb = null) {

		try {
			this._db[collection].update(query, update, options, cb);
		} catch (e) {
			logger.error(`Update ${collection} doc sync error ${BeameLogger.formatError(e)}`)
		}

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
						this._db[collection].persistence.compactDatafile();
						resolve()
					}
					// numRemoved = 1
				});
			}
		);
	}

	_removeDocSync(collection, query, options = {}) {

		this._db[collection].remove(query, options);
	}

	//endregion

	//region public methods
	/**
	 * @param {Credential} cred
	 * @param {Function|undefined} [cb]
	 */
	insertCredFromStore(cred, cb) {
		try {
			const Credential = require('./Credential');
			if (!(cred instanceof Credential)) {
				cb && cb();
				return;
			}

			const insertCred = () => {
				if (!cred.hasKey("X509")) {
					cb && cb();
					return;
				}

				let ocspStatus    = Config.OcspStatus.Unknown,
				    lastOcspCheck = null,
				    validity      = cred.certData.validity || {start: null, end: null},
				    revoked       = !!(cred.metadata.revoked);


				if (cred.metadata.ocspStatus) {
					ocspStatus    = revoked ? Config.OcspStatus.Bad : Config.OcspStatus.Good;
					lastOcspCheck = CommonUtils.tryParseDate(cred.metadata.ocspStatus.date);
				}

				let doc = {
					fqdn:          cred.fqdn,
					notBefore:     CommonUtils.tryParseDate(validity.start),
					notAfter:      CommonUtils.tryParseDate(validity.end),
					hasPrivateKey: cred.hasKey("PRIVATE_KEY"),
					revoked:       revoked,
					expired:       cred.expired,
					lastOcspCheck: lastOcspCheck,
					nextOcspCheck: null,
					lastLoginDate: null,
					ocspStatus:    ocspStatus

				};

				this._insertDocSync(CredsCollectionName, doc, (err, doc) => {
					if (err) {
						logger.error(`Insert cred ${cred.fqdn} doc error ${BeameLogger.formatError(err)}`);
					}
					cb && cb(err, doc);
				});
			};

			this._findDocSync(CredsCollectionName, {fqdn: cred.fqdn}, (err, doc) => {
				if (!err && !doc) {
					insertCred();
				}
				else {
					cb && cb()
				}
			})

		} catch (e) {
			logger.error(`Update cred from store for ${cred.fqdn} error ${BeameLogger.formatError(e)}`);
		}
	}

	updateValidity(fqdn, validity) {
		try {
			let query   = {fqdn: fqdn},
			    options = {upsert: true, returnUpdatedDocs: false},
			    update  = {
				    $set: {
					    notBefore: CommonUtils.tryParseDate(validity.start),
					    notAfter:  CommonUtils.tryParseDate(validity.end)
				    }
			    };

			this._updateDocSync(CredsCollectionName, query, update, options, nop);
		} catch (e) {
			logger.error(`Update cache validity for ${fqdn} error ${BeameLogger.formatError(e)}`);
		}
	}

	saveRevocation(fqdn) {
		try {
			let query   = {fqdn: fqdn},
			    options = {upsert: true, returnUpdatedDocs: false},
			    update  = {
				    $set: {
					    revoked:       true,
					    ocspStatus:    Config.OcspStatus.Bad,
					    nextOcspCheck: null
				    }
			    };

			this._updateDocSync(CredsCollectionName, query, update, options, nop);
		} catch (e) {
			logger.error(`Update cache validity for ${fqdn} error ${BeameLogger.formatError(e)}`);
		}
	}

	get(fqdn) {
		let query = {fqdn: fqdn};
		return this._findDoc(CredsCollectionName, query);
	}

	setOcspStatus(fqdn, status) {
		try {
			let query   = {fqdn: fqdn},
			    options = {upsert: true, returnUpdatedDocs: false},
			    update  = {
				    $set: {
					    ocspStatus:    status,
					    lastOcspCheck: new Date()
				    }
			    };

			//TODO handle Unknown and Unavailable statuses
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


			this._updateDocSync(CredsCollectionName, query, update, options, nop);
		} catch (e) {
			logger.error(`Update cache validity for ${fqdn} error ${BeameLogger.formatError(e)}`);
		}
	}

	getOcspStatus(fqdn) {
		return new Promise((resolve) => {
				this.get(fqdn).then(doc => {
					doc ? resolve(doc.ocspStatus) : resolve(OcspStatus.Unknown);
				}).catch(e => {
					logger.error(`Get lastLogin for ${fqdn} error ${BeameLogger.formatError(e)}`);
					resolve(OcspStatus.Unavailable);
				});
			}
		);
	}

	setLastLogin(fqdn, date) {
		try {
			let query   = {fqdn: fqdn},
			    options = {upsert: true, returnUpdatedDocs: false},
			    update  = {
				    $set: {
					    lastLoginDate: CommonUtils.tryParseDate(date)
				    }
			    };

			this._updateDocSync(CredsCollectionName, query, update, options, nop);
		} catch (e) {
			logger.error(`Update cache validity for ${fqdn} error ${BeameLogger.formatError(e)}`);
		}
	}

	getLastLogin(fqdn) {
		return new Promise((resolve, reject) => {
				this.get(fqdn).then(doc => {
					return resolve(doc.lastLoginDate)
				}).catch(e => {
					logger.error(`Get lastLogin for ${fqdn} error ${BeameLogger.formatError(e)}`);
					return reject(e);
				});
			}
		);

	}


	//endregion

	set storeState(checksum) {
		try {
			DirectoryServices.saveFileSync(this._datFilePath, checksum);
		} catch (e) {
			return null;
		}
	}

	get storeState() {
		try {
			return DirectoryServices.doesPathExists(this._datFilePath) ? DirectoryServices.readFile(this._datFilePath).toString() : null;
		} catch (e) {
			logger.error(`get store state error ${BeameLogger.formatError(e)}`);
			return null;
		}
	}
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