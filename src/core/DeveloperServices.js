/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';
require('../utils/Globals');
var debug = require("debug")("./src/services/DeveloperServices.js");
var _ = require('underscore');
var path = require('path');
var homedir = global.__homedir;
var devPath = global.devPath;

new (require('../services/BeameStore'))();

var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.DeveloperApi;

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
	return beameUtils.makePath(devPath, hostname + '/');
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
			beameUtils.getNodeMetadataAsync(devDir, hostname, global.AppModules.Developer).then(onMetadataReceived, onValidationError);
		}

		function validateDevCerts() {
			beameUtils.isNodeCertsExistsAsync(devDir, global.ResponseKeys.NodeFiles, global.AppModules.Developer, hostname, global.AppModules.Developer).then(getMetadata).catch(onValidationError);
		}

		if (_.isEmpty(hostname)) {
			reject('Hostname required');
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
var saveDeveloper = function (email, developerName, callback) {

	provisionApi.setAuthData(beameUtils.getAuthToken(homedir, global.authData.PK_PATH, global.authData.CERT_PATH));

	var postData = {
		name: developerName,
		email: email
	};

	var apiData = beameUtils.getApiData(apiActions.CreateDeveloper.endpoint, postData, true);

	provisionApi.runRestfulAPI(apiData, function (error, payload) {
		if (!error) {

			payload.name = developerName;
			payload.email = email;

			var devDir = makeDeveloperDir(payload.hostname);

			dataServices.createDir(devDir);

			dataServices.savePayload(devDir, payload, global.ResponseKeys.DeveloperCreateResponseKeys, global.AppModules.Developer, function (error) {
				if (!callback) return;

				if (!error) {
					beameUtils.getNodeMetadataAsync(devDir, payload.hostname, global.AppModules.Developer).then(function (metadata) {
						callback(null, metadata);
					}, callback);
				}
				else {
					callback(error, null);
				}
			});

		}
		else {
			//console.error(error);
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
	var errMsg;
	var devDir = beameUtils.makePath(devPath, hostname + "/");

	if (_.isEmpty(hostname)) {
		errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.HostnameRequired, "Get developer certs, hostname missing", {"error": "hostname missing"});
		//console.error(errMsg);
		callback && callback(errMsg, null);
		return;
	}

	/*---------- private callbacks -------------------*/
	function onMetadataReceived(metadata) {

		dataServices.createCSR(devDir, hostname).then(
			function onCsrCreated(csr) {

				provisionApi.setAuthData(beameUtils.getAuthToken(homedir, global.authData.PK_PATH, global.authData.CERT_PATH));

				var postData = {
					csr: csr,
					uid: metadata.uid
				};

				var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						dataServices.saveCerts(devDir, payload, callback);
					}
					else {
						error.data.hostname = hostname;
						//console.error(error);
						callback(error, null);
					}
				});

			},
			function onCsrCreationFailed(error) {
				//console.error(error);
				callback && callback(error, null);
			});
	}

	function getDeveloperMetadata() {
		/*---------- read developer data and proceed -------------*/
		beameUtils.getNodeMetadataAsync(devDir, hostname, global.AppModules.Developer).then(onMetadataReceived).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.isHostnamePathValidAsync(devDir, global.AppModules.Developer, hostname).then(getDeveloperMetadata).catch(beameUtils.onValidationError.bind(null, callback));
};

/**
 * Developer services
 * @constructor
 */
var DeveloperServices = function () {

};

/**
 * Register developer => Receive developer Certs => Update developer profile
 * @param {String} developerName
 * @param {String} developerEmail
 * @param {Function} callback
 */
DeveloperServices.prototype.createDeveloper = function (developerName, developerEmail, callback) {

	var debugMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.DebugInfo, "Call Create Developer", {
		"name": developerName,
		"email": developerEmail
	});
	debug(debugMsg);

	saveDeveloper(developerEmail, developerName, function (error, payload) {
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
 * @param {String} hostname
 * @param {String} uid
 * @param {Function} callback
 */
DeveloperServices.prototype.completeDeveloperRegistration = function (hostname, uid, callback) {
	var errMsg;

	if (_.isEmpty(hostname)) {
		errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.HostnameRequired, "Get developer certs, hostname missing", {"error": "hostname missing"});
		//console.error(errMsg);
		callback && callback(errMsg, null);
		return;
	}

	var devDir = makeDeveloperDir(hostname);

	dataServices.createDir(devDir);

	/** @type {typeof CompleteRegistrationRequestToken} **/
	var payload = {
		hostname: hostname,
		uid: uid,
		name: hostname,
		email: hostname
	};

	dataServices.savePayload(devDir, payload, global.ResponseKeys.DeveloperCreateResponseKeys, global.AppModules.Developer, function (error) {
		if (!callback) return;

		if (!error) {
			beameUtils.getNodeMetadataAsync(devDir, payload.hostname, global.AppModules.Developer).then(onMetadataReceived, callback);
		}
		else {
			callback(error, null);
		}
	});

	/*---------- private callbacks -------------------*/
	function onMetadataReceived(metadata) {

		dataServices.createCSR(devDir, hostname).then(
			function onCsrCreated(csr) {

				var postData = {
					csr: csr,
					hostname: metadata.hostname,
					uid: metadata.uid
				};

				var apiData = beameUtils.getApiData(apiActions.CompleteRegistration.endpoint, postData, true);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						dataServices.saveCerts(devDir, payload, callback);
					}
					else {
						error.data.hostname = hostname;
						//console.error(error);
						callback(error, null);
					}
				});

			},
			function onCsrCreationFailed(error) {
				//console.error(error);
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

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

		var postData = {
			email: email,
			name: name ? name : metadata.name
		};

		var apiData = beameUtils.getApiData(apiActions.UpdateProfile.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error) {
			if (!error) {
				/*---------- update metadata -------------*/
				metadata.name = postData.name;
				metadata.email = email;

				dataServices.saveFile(devDir, global.metadataFileName, beameUtils.stringify(metadata));

				callback(null, metadata);
			}
			else {
				error.data.hostname = hostname;
				//console.error(error);
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

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

		dataServices.createCSR(devDir, hostname, global.CertFileNames.TEMP_PRIVATE_KEY).then(
			function onCsrCreated(csr) {

				var postData = {
					csr: csr
				};

				var apiData = beameUtils.getApiData(apiActions.RenewCert.endpoint, postData, true);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						dataServices.renameFile(devDir, global.CertFileNames.TEMP_PRIVATE_KEY, global.CertFileNames.PRIVATE_KEY, function (error) {
							if (!error) {
								dataServices.saveCerts(beameUtils.makePath(devDir, '/'), payload, callback);
							}
							else {
								callback && callback(error, null);
							}
						});

					}
					else {

						dataServices.deleteFile(devDir, global.CertFileNames.TEMP_PRIVATE_KEY);

						error.data.hostname = hostname;
						//console.error(error);
						callback(error, null);
					}
				});

			},
			function onCsrCreationFailed(error) {
				//console.error(error);
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
		var recoveryData = dataServices.readJSON(beameUtils.makePath(devDir, global.CertFileNames.RECOVERY));

		if (_.isEmpty(recoveryData)) {
			callback('Recovery code not found', null);
			return;
		}

		dataServices.createCSR(devDir, hostname).then(function onCsrCreated(csr) {


			/** @type {typeof DeveloperRestoreCertRequestToken} **/
			var postData = {
				csr: csr,
				hostname: hostname,
				recovery_code: recoveryData.recovery_code
			};

			var apiData = beameUtils.getApiData(apiActions.RestoreCert.endpoint, postData, true);

			provisionApi.runRestfulAPI(apiData, function (error, payload) {
				if (!error) {

					dataServices.deleteFile(devDir, global.CertFileNames.RECOVERY);

					dataServices.saveCerts(beameUtils.makePath(devDir, '/'), payload, callback);
				}
				else {
					error.data.hostname = hostname;
					//console.error(error);
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

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

		var postData = {
			hostname: hostname
		};

		var apiData = beameUtils.getApiData(apiActions.RevokeCert.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error, payload) {
			if (!error) {

				beameUtils.deleteHostCerts(hostname);

				dataServices.saveFile(devDir, global.CertFileNames.RECOVERY, beameUtils.stringify(payload), function (error) {
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
				//console.error(error);
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
		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

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

module.exports = DeveloperServices;
