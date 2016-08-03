/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';

var config       = require('../../config/Config');
var debug        = require("debug")("./src/services/LocalClientServices.js");
var _            = require('underscore');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils   = require('../utils/BeameUtils');
var apiActions   = require('../../config/ApiConfig.json').Actions.LocalClient;

var PATH_MISMATCH_DEFAULT_MSG = 'Local Client folder not found';

/**
 * @param {String} hostname
 * @param {String} atomDir
 * @param {String|null} [localClientDir]
 * @param {boolean} validateEdgeHostname
 * @returns {Promise}
 */
var isRequestValid = function (hostname, atomDir, localClientDir, validateEdgeHostname) {

	return new Promise(function (resolve, reject) {

		function onValidationError(error) {
			reject(error);
		}

		function onMetadataReceived(metadata) {
			resolve(metadata);
		}

		function getMetadata() {
			dataServices.getNodeMetadataAsync(localClientDir || atomDir, hostname, config.AppModules.Atom).then(onMetadataReceived).catch(onValidationError);
		}

		function validateAtomCerts() {
			dataServices.isNodeCertsExistsAsync(atomDir, config.ResponseKeys.NodeFiles, config.AppModules.Atom, hostname, config.AppModules.Developer).then(getMetadata).catch(onValidationError);
		}

		function validateLocalClientHost() {
			if (validateEdgeHostname && _.isEmpty(hostname)) {
				reject('Hostname required');
			}
			else {
				validateAtomCerts();
			}
		}

		if (_.isEmpty(hostname)) {
			reject('Hostname required');
		}
		else {
			validateLocalClientHost();
		}

	});
};

/**
 *
 * @param {String} atomHostname
 * @param {String} localIp
 * @param {String|null|undefined} edgeClientFqdn
 * @param {Function} callback
 * @this {LocalClientServices}
 */
var registerLocalClient = function (atomHostname, localIp, edgeClientFqdn, callback) {
	var atomDir;

	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			ip: localIp
		};

		if (edgeClientFqdn) {
			postData.hostname = edgeClientFqdn;
		}

		var apiData = beameUtils.getApiData(apiActions.CreateLocalClient.endpoint, postData, true);

		provisionApi.runRestfulAPI(apiData, function (error, payload) {
			if (!error) {
				payload.parent_fqdn      = atomHostname;
				payload.edge_client_fqdn = edgeClientFqdn ? edgeClientFqdn : "";
				payload.local_ip         = localIp;


				var localClientDir = beameUtils.makePath(atomDir, payload.hostname + '/');

				dataServices.createDir(localClientDir);

				dataServices.savePayload(localClientDir, payload, config.ResponseKeys.LocalClientResponseKeys, config.AppModules.LocalClient, function (error) {
					if (!callback) return;

					if (!error) {

						dataServices.getNodeMetadataAsync(localClientDir, payload.hostname, config.AppModules.LocalClient).then(function (metadata) {
							callback(null, metadata);
						}, callback);
					}
					else {
						callback(error, null);
					}
				});

			}
			else {
				error.data.hostname = atomHostname;
				// console.error(error);
				callback && callback(error, null);
			}
		});

	}

	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onAtomPathReceived(data) {

		atomDir = data['path'];

		isRequestValid(atomHostname, atomDir, null, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, 'Atom folder not found'));
};

/**
 *
 * @param {String} atomHostname
 * @param {String} localClientHostname
 * @param {Function} callback
 * @this {LocalClientServices}
 */
var getCert = function (atomHostname, localClientHostname, callback) {
	var errMsg;
	var localClientDir, atomDir;


	function onRequestValidated(metadata) {

		dataServices.createCSR(localClientDir, localClientHostname).then(
			function onCsrCreated(csr) {

				provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

				var postData = {
					csr: csr,
					uid: metadata.uid
				};

				var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {
						dataServices.saveCerts(beameUtils.makePath(localClientDir, '/'), payload, callback);
					}
					else {
						error.data.hostname = localClientHostname;
						console.error(error);
						callback(errMsg, null);
					}
				});

			},
			function onCsrCreationFailed(error) {
				console.error(error);
				callback && callback(error, null);
			});
	}

	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onEdgePathReceived(data) {

		localClientDir = data['path'];
		atomDir        = data['parent_path'];

		isRequestValid(atomHostname, atomDir, localClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}


	beameUtils.findHostPathAndParentAsync(localClientHostname).then(onEdgePathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};


var LocalClientServices = function () {
};

/**
 *
 * @param {String} atomHostname
 * @param {String|null|undefined} [edgeClientFqdn]
 * @param {Function} callback
 */
LocalClientServices.prototype.createLocalClients = function (atomHostname, edgeClientFqdn, callback) {
	var self = this;

	var debugMsg = beameUtils.formatDebugMessage(config.AppModules.LocalClient, config.MessageCodes.DebugInfo, "Call Create Local Clients", {
		"atom": atomHostname
	});
	debug(debugMsg);

	if (_.isEmpty(atomHostname)) {
		callback('Atom host required', null);
		return;
	}

	beameUtils.getLocalActiveInterfaces().then(function (addresses) {
		var errorMessage = null, isSuccess = true;
		for (var i = 0; i < addresses.length; i++) {
			self.createLocalClient(atomHostname, addresses[i], edgeClientFqdn, function (error) {
				if (error) {
					errorMessage += (error + ';');
					isSuccess = false;
				}
			})
		}

		isSuccess ? callback(null, addresses.length + ' local clients created') : callback(errorMessage, null);
	}, function (error) {
		callbacks(error, null);
	})
};

/**
 *
 * @param {String} atomHostname
 * @param {String} localIp
 * @param {String|null|undefined} [edgeClientFqdn]
 * @param {Function} callback
 */
LocalClientServices.prototype.createLocalClient = function (atomHostname, localIp, edgeClientFqdn, callback) {

	var debugMsg = beameUtils.formatDebugMessage(config.AppModules.LocalClient, config.MessageCodes.DebugInfo, "Call Create Local Client", {
		"atom": atomHostname
	});
	debug(debugMsg);

	if (_.isEmpty(atomHostname)) {
		callback('Atom host required', null);
		return;
	}
	if (_.isEmpty(localIp)) {
		callback('LocalIp required', null);
		return;
	}

	function onLocalClientRegistered(error, payload) {
		if (!error) {

			if (payload && payload.hostname) {
				var hostname = payload.hostname;

				getCert(atomHostname, hostname, function (error) {
					if (callback) {
						error ? callback(error, null) : callback(null, payload);
					}
				});
			}
			else {
				console.error("unexpected error", payload);
			}

		}
		else {
			callback && callback(error, null);
		}
	}

	registerLocalClient(atomHostname, localIp, edgeClientFqdn, onLocalClientRegistered);

};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} localClientHostname
 * @param {Function} callback
 */
LocalClientServices.prototype.renewCert = function (localClientHostname, callback) {

	var localClientDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		dataServices.createCSR(localClientDir, localClientHostname, config.CertFileNames.TEMP_PRIVATE_KEY).then(
			function onCsrCreated(csr) {

				var postData = {
					hostname: localClientHostname,
					csr:      csr
				};

				var apiData = beameUtils.getApiData(apiActions.RenewCert.endpoint, postData, true);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						dataServices.renameFile(localClientDir, config.CertFileNames.TEMP_PRIVATE_KEY, config.CertFileNames.PRIVATE_KEY, function (error) {
							if (!error) {
								dataServices.saveCerts(beameUtils.makePath(localClientDir, '/'), payload, callback);
							}
							else {
								callback && callback(error, null);
							}
						});

					}
					else {

						dataServices.deleteFile(localClientDir, config.CertFileNames.TEMP_PRIVATE_KEY);

						console.error(error);
						callback(error, null);
					}
				});

			},
			function onCsrCreationFailed(error) {
				console.error(error);
				callback && callback(error, null);
			});
	}

	function onLocalClientPathReceived(data) {

		localClientDir = data['path'];

		atomDir = data['parent_path'];

		isRequestValid(localClientHostname, atomDir, localClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));

	}

	beameUtils.findHostPathAndParentAsync(localClientHostname).then(onLocalClientPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));


};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} localClientHostname
 * @param {Function} callback
 */
LocalClientServices.prototype.revokeCert = function (localClientHostname, callback) {

	var localClientDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			hostname: localClientHostname
		};

		var apiData = beameUtils.getApiData(apiActions.RevokeCert.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error) {
			if (!error) {

				beameUtils.deleteHostCerts(localClientHostname);

				callback && callback(null, 'done');
			}
			else {
				console.error(error);
				callback && callback(error, null);
			}
		});
	}

	function onLocalClientPathReceived(data) {

		localClientDir = data['path'];

		atomDir = data['parent_path'];

		isRequestValid(localClientHostname, atomDir, localClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));

	}

	beameUtils.findHostPathAndParentAsync(localClientHostname).then(onLocalClientPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};

module.exports = LocalClientServices;
