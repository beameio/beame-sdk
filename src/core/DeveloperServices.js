/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';

var fs = require('fs');

var config        = require('../../config/Config');
const module_name = config.AppModules.Developer;
var BeameLogger   = require('../utils/Logger');
var logger        = new BeameLogger(module_name);
var _             = require('underscore');
var path          = require('path');
var os            = require('os');
var home          = os.homedir();
var homedir       = home;
var devPath       = config.localCertsDir;

new (require('../services/BeameStore'))();

var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils   = require('../utils/BeameUtils');
var apiActions   = require('../../config/ApiConfig.json').Actions.DeveloperApi;

var authData = {
	"PK_PATH":   "/authData/pk.pem",
	"CERT_PATH": "/authData/x509.pem"
};

/**
 * @typedef {Object} CompleteRegistrationRequestToken
 * @property {String} csr
 * @property {String} uid
 * @property {String} hostname
 */

/**
 * @typedef {Object} DeveloperRestoreCertRequestToken
 * @property {String} csr
 * @property {String} recovery_code
 * @property {String} hostname
 */

/**-----------------Private services----------------**/

var PATH_MISMATCH_DEFAULT_MSG = 'Developer folder not found';

/**----------------------Private methods ------------------------  **/

/**
 *
 * @param {String} hostname
 * @returns {String}
 */
var makeDeveloperDir = function (hostname) {
	return beameUtils.makePath(config.localCertsDir, hostname + '/');
};

var isRequestValid = function (hostname, devDir) {

	return new Promise(function (resolve, reject) {
		function onValidationError(error) {
			reject(error);
		}

		function onMetadataReceived(metadata) {
			resolve(metadata);
		}

		function getMetadata() {
			dataServices.getNodeMetadataAsync(devDir, hostname, module_name).then(onMetadataReceived, onValidationError);
		}

		function validateDevCerts() {
			dataServices.isNodeCertsExistsAsync(devDir, config.ResponseKeys.NodeFiles, module_name, hostname, module_name).then(getMetadata).catch(onValidationError);
		}

		if (_.isEmpty(hostname)) {
			reject(logger.formatErrorMessage("FQDN required", module_name));
		}
		else {
			validateDevCerts();
		}
	});
};

/**
 *
 * @param {String|null|undefined} [developerName]
 * @param {String} email
 * @param {Function} callback
 */
var registerDeveloper = function (email, developerName, callback) {

	provisionApi.setAuthData(beameUtils.getAuthToken(homedir, authData.PK_PATH, authData.CERT_PATH));

	var postData = {
		name:  developerName,
		email: email
	};

	var apiData = beameUtils.getApiData(apiActions.CreateDeveloper.endpoint, postData, true);

	logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.Registering, email);

	provisionApi.runRestfulAPI(apiData, function (error, payload) {
		if (!error) {

			logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.Registered, payload.hostname);

			payload.name  = developerName;
			payload.email = email;

			var devDir = makeDeveloperDir(payload.hostname);

			dataServices.createDir(devDir);

			dataServices.savePayload(devDir, payload, config.ResponseKeys.DeveloperCreateResponseKeys, module_name, function (error) {
				if (!callback) return;

				if (!error) {
					dataServices.getNodeMetadataAsync(devDir, payload.hostname, module_name).then(function (metadata) {
						callback(null, metadata);
					}, callback);
				}
				else {
					callback(error, null);
				}
			});

		}
		else {
			callback && callback(error, null);
		}

	});

};

/**
 *
 * @param {String} hostname => developer hostname
 * @param {Function} callback
 */
var getCert = function (hostname, callback) {
	var devDir = beameUtils.makePath(devPath, hostname + "/");

	if (_.isEmpty(hostname)) {

		callback && callback(logger.formatErrorMessage("Get developer certs => Developer fqdn required", module_name), null);
		return;
	}

	/*---------- private callbacks -------------------*/
	function onMetadataReceived(metadata) {

		dataServices.createCSR(devDir, hostname).then(
			function onCsrCreated(csr) {

				provisionApi.setAuthData(beameUtils.getAuthToken(homedir, authData.PK_PATH, authData.CERT_PATH));

				var postData = {
					csr: csr,
					uid: metadata.uid
				};

				var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

				logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.RequestingCerts, hostname);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.ReceivedCerts, hostname);

						dataServices.saveCerts(devDir, payload, callback);
					}
					else {
						error.data.hostname = hostname;
						callback(error, null);
					}
				});

			},
			function onCsrCreationFailed(error) {
				callback && callback(error, null);
			});
	}

	function getDeveloperMetadata() {
		/*---------- read developer data and proceed -------------*/
		dataServices.getNodeMetadataAsync(devDir, hostname, module_name).then(onMetadataReceived).catch(beameUtils.onValidationError.bind(null, callback));
	}

	dataServices.isHostnamePathValidAsync(devDir, module_name, hostname).then(getDeveloperMetadata).catch(beameUtils.onValidationError.bind(null, callback));
};

/**
 * Developer services
 * @constructor
 */
var DeveloperServices = function () {

};

/**
 * Create developer => Receive developer Certs => Update developer profile
 * @param {String} developerName
 * @param {String} developerEmail
 * @param {Function} callback
 */
DeveloperServices.prototype.createDeveloper = function (developerName, developerEmail, callback) {

	logger.info(`Creating developer ${developerName} with email ${developerEmail}`);

	registerDeveloper(developerEmail, developerName, function (error, payload) {
		if (!error) {

			var hostname = payload.hostname;

			getCert(hostname, function (error) {
				if (!error) {
					//self.updateProfile(hostname, developerEmail, developerName, callback);
					callback && callback(null, payload);
				}
				else {
					callback && callback(error, null);
				}
			});
		}
		else {
			callback && callback(error, null);
		}
	});
};

/**
 *
 * @returns {boolean}
 */
DeveloperServices.prototype.canCreateDeveloper = function () {

	var t = beameUtils.getAuthToken(homedir, authData.PK_PATH, authData.CERT_PATH);
	return fs.existsSync(t.x509) && fs.existsSync(t.pk);
};

/**
 *
 * @returns {boolean}
 */
DeveloperServices.prototype.canRegisterDeveloper = DeveloperServices.prototype.canCreateDeveloper;

/**
 *
 * @param {String} developer_fqdn
 * @param {String} uid
 * @param {Function} callback
 */
DeveloperServices.prototype.completeDeveloperRegistration = function (developer_fqdn, uid, callback) {


	if (_.isEmpty(developer_fqdn)) {
		callback && callback(logger.formatErrorMessage("Complete developer registration => Developer fqdn required", module_name), null);
		return;
	}

	if (_.isEmpty(uid)) {
		callback && callback(logger.formatErrorMessage("Complete developer registration => Uid required", module_name), null);
		return;
	}

	logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.Registering, developer_fqdn);

	var devDir = makeDeveloperDir(developer_fqdn);

	dataServices.createDir(devDir);

	/** @type {typeof CompleteRegistrationRequestToken} **/
	var payload = {
		hostname: developer_fqdn,
		uid:      uid,
		name:     developer_fqdn,
		email:    developer_fqdn
	};

	dataServices.savePayload(devDir, payload, config.ResponseKeys.DeveloperCreateResponseKeys, module_name, function (error) {
		if (!callback) return;

		if (!error) {
			dataServices.getNodeMetadataAsync(devDir, payload.hostname, module_name).then(onMetadataReceived, callback);
		}
		else {
			callback(error, null);
		}
	});

	/*---------- private callbacks -------------------*/
	function onMetadataReceived(metadata) {

		dataServices.createCSR(devDir, developer_fqdn).then(
			function onCsrCreated(csr) {

				var postData = {
					csr:      csr,
					hostname: metadata.hostname,
					uid:      metadata.uid
				};

				var apiData = beameUtils.getApiData(apiActions.CompleteRegistration.endpoint, postData, true);

				logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.RequestingCerts, developer_fqdn);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						logger.printStandardEvent(BeameLogger.EntityLevel.Developer, BeameLogger.StandardFlowEvent.ReceivedCerts, developer_fqdn);

						dataServices.saveCerts(devDir, payload, callback);
					}
					else {
						error.data.hostname = developer_fqdn;
						callback(error, null);
					}
				});

			},
			function onCsrCreationFailed(error) {
				callback && callback(error, null);
			});
	}

};

/**
 *
 * @param {String} hostname => developer hostname
 * @param {String} email
 * @param {String|null|undefined} [name]
 * @param {Function} callback
 */
DeveloperServices.prototype.updateProfile = function (hostname, name, email, callback) {
	var devDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated(metadata) {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			email: email,
			name:  name ? name : metadata.name
		};

		var apiData = beameUtils.getApiData(apiActions.UpdateProfile.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error) {
			if (!error) {
				/*---------- update metadata -------------*/
				metadata.name  = postData.name;
				metadata.email = email;

				dataServices.saveFile(devDir, config.metadataFileName, beameUtils.stringify(metadata));

				callback(null, metadata);
			}
			else {
				error.data.hostname = hostname;
				callback(error, null);
			}
		});


	}

	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onDeveloperPathReceived(data) {

		devDir = data['path'];

		isRequestValid(hostname, devDir).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(hostname).then(onDeveloperPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};

/**
 *
 * @param {String} hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.renewCert = function (hostname, callback) {
	var devDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		dataServices.createCSR(devDir, hostname, config.CertFileNames.TEMP_PRIVATE_KEY).then(
			function onCsrCreated(csr) {

				var postData = {
					csr: csr
				};

				var apiData = beameUtils.getApiData(apiActions.RenewCert.endpoint, postData, true);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						dataServices.renameFile(devDir, config.CertFileNames.TEMP_PRIVATE_KEY, config.CertFileNames.PRIVATE_KEY, function (error) {
							if (!error) {
								dataServices.saveCerts(beameUtils.makePath(devDir, '/'), payload, callback);
							}
							else {
								callback && callback(error, null);
							}
						});

					}
					else {

						dataServices.deleteFile(devDir, config.CertFileNames.TEMP_PRIVATE_KEY);

						error.data.hostname = hostname;
						callback(error, null);
					}
				});

			},
			function onCsrCreationFailed(error) {
				callback && callback(error, null);
			});
	}


	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onDeveloperPathReceived(data) {

		devDir = data['path'];

		isRequestValid(hostname, devDir).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(hostname).then(onDeveloperPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};

/**
 *
 * @param {String} hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.restoreCert = function (hostname, callback) {
	var devDir;

	function onRequestValidated() {
		var recoveryData = dataServices.readJSON(beameUtils.makePath(devDir, config.CertFileNames.RECOVERY));

		if (_.isEmpty(recoveryData)) {
			callback(logger.formatErrorMessage("Restore developer credentials => recovery code not found", module_name), null);
			return;
		}

		dataServices.createCSR(devDir, hostname).then(function onCsrCreated(csr) {


			/** @type {typeof DeveloperRestoreCertRequestToken} **/
			var postData = {
				csr:           csr,
				hostname:      hostname,
				recovery_code: recoveryData.recovery_code
			};

			var apiData = beameUtils.getApiData(apiActions.RestoreCert.endpoint, postData, true);

			provisionApi.runRestfulAPI(apiData, function (error, payload) {
				if (!error) {

					dataServices.deleteFile(devDir, config.CertFileNames.RECOVERY);

					dataServices.saveCerts(beameUtils.makePath(devDir, '/'), payload, callback);
				}
				else {
					error.data.hostname = hostname;
					callback(error, null);
				}
			});

		}).catch(beameUtils.onValidationError.bind(null, callback));
	}

	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onDeveloperPathReceived(data) {

		devDir = data['path'];

		isRequestValid(hostname, devDir).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(hostname).then(onDeveloperPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};

/**
 *
 * @param {String} hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.revokeCert = function (hostname, callback) {
	var devDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			hostname: hostname
		};

		var apiData = beameUtils.getApiData(apiActions.RevokeCert.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error, payload) {
			if (!error) {

				beameUtils.deleteHostCerts(hostname);

				dataServices.saveFile(devDir, config.CertFileNames.RECOVERY, beameUtils.stringify(payload), function (error) {
					if (!callback) return;

					if (!error) {
						callback(null, 'done');
					}
					else {
						callback(error, null);
					}
				});

			}
			else {
				error.data.hostname = hostname;
				callback(error, null);
			}
		});

	}

	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onDeveloperPathReceived(data) {

		devDir = data['path'];

		isRequestValid(hostname, devDir).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(hostname).then(onDeveloperPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};

/**
 *
 * @param {String} hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.getStats = function (hostname, callback) {
	var devDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {
		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var apiData = beameUtils.getApiData(apiActions.GetStats.endpoint, {}, false);

		provisionApi.runRestfulAPI(apiData, callback, 'GET');
	}

	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onDeveloperPathReceived(data) {

		devDir = data['path'];

		isRequestValid(hostname, devDir).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(hostname).then(onDeveloperPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};

/**
 * Register developer  process
 * @param {String} developerName
 * @param {String} developerEmail
 * @param {Function} callback
 */
DeveloperServices.prototype.registerDeveloper = function (developerName, developerEmail, callback) {

	provisionApi.setAuthData(beameUtils.getAuthToken(homedir, authData.PK_PATH, authData.CERT_PATH));

	var postData = {
		name:  developerName,
		email: developerEmail
	};

	var apiData = beameUtils.getApiData(apiActions.RegisterDeveloper.endpoint, postData, true);

	provisionApi.runRestfulAPI(apiData, function (error, payload) {
		if (!error) {

			payload.name  = developerName;
			payload.email = developerEmail;

			callback && callback(null, payload);

		}
		else {
			callback && callback(error, null);
		}

	});
};

/**
 *
 * @param {TimeUnits} timeUnit
 * @param {number} qty
 * @param {Function} callback
 */
DeveloperServices.prototype.deleteTestDevelopers = function (timeUnit, qty, callback) {

	provisionApi.setAuthData(beameUtils.getAuthToken(homedir, authData.PK_PATH, authData.CERT_PATH));

	var postData = {
		unit: timeUnit,
		qty:  qty
	};

	var apiData = beameUtils.getApiData(apiActions.DeleteTestDevelopers.endpoint, postData, true);

	provisionApi.runRestfulAPI(apiData, function (error) {
		if (!error) {

			callback && callback(null, 'done');

		}
		else {
			callback && callback(error, null);
		}

	});
};

module.exports = DeveloperServices;
