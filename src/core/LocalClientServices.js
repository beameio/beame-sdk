/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';

var config = require('../../config/Config');
const module_name = config.AppModules.LocalClient;
var BeameLogger = require('../utils/Logger');
var logger = new BeameLogger(module_name);
var _ = require('underscore');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.LocalClient;

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
			dataServices.getNodeMetadataAsync(localClientDir || atomDir, hostname, module_name).then(onMetadataReceived).catch(onValidationError);
		}
		
		function validateAtomCerts() {
			dataServices.isNodeCertsExistsAsync(atomDir, config.ResponseKeys.NodeFiles, module_name, hostname, config.AppModules.Atom).then(getMetadata).catch(onValidationError);
		}
		
		function validateLocalClientHost() {
			if (validateEdgeHostname && _.isEmpty(hostname)) {
				reject(logger.formatErrorMessage("FQDN required", module_name));
			}
			else {
				validateAtomCerts();
			}
		}
		
		if (_.isEmpty(hostname)) {
			reject(logger.formatErrorMessage("FQDN required", module_name));
		}
		else {
			validateLocalClientHost();
		}
		
	});
};

/**
 *
 * @param {String} atom_fqdn
 * @param {String} localIp
 * @param {String|null} [edgeClientFqdn]
 * @param {Function} callback
 * @this {LocalClientServices}
 */
var registerLocalClient = function (atom_fqdn, localIp, edgeClientFqdn, callback) {
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
		
		logger.printStandardEvent(BeameLogger.EntityLevel.LocalClient, BeameLogger.StandardFlowEvent.Registering, ` for atom ${atom_fqdn}`);
		
		
		provisionApi.runRestfulAPI(apiData, function (error, payload) {
			if (!error) {
				
				logger.printStandardEvent(BeameLogger.EntityLevel.LocalClient, BeameLogger.StandardFlowEvent.Registered, payload.hostname);
				
				payload.parent_fqdn = atom_fqdn;
				payload.edge_client_fqdn = edgeClientFqdn ? edgeClientFqdn : "";
				payload.local_ip = localIp;
				
				
				var localClientDir = beameUtils.makePath(atomDir, payload.hostname + '/');
				
				dataServices.createDir(localClientDir);
				
				dataServices.savePayload(localClientDir, payload, config.ResponseKeys.LocalClientResponseKeys, module_name, function (error) {
					if (!callback) return;
					
					if (!error) {
						
						dataServices.getNodeMetadataAsync(localClientDir, payload.hostname, module_name).then(function (metadata) {
							callback(null, metadata);
						}, callback);
					}
					else {
						callback(error, null);
					}
				});
				
			}
			else {
				error.data.hostname = atom_fqdn;
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
		
		isRequestValid(atom_fqdn, atomDir, null, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}
	
	beameUtils.findHostPathAndParentAsync(atom_fqdn).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, 'Atom folder not found'));
};

/**
 *
 * @param {String} atom_fqdn
 * @param {String} local_client_fqdn
 * @param {Function} callback
 * @this {LocalClientServices}
 */
var getCert = function (atom_fqdn, local_client_fqdn, callback) {
	var localClientDir, atomDir;
	
	
	function onRequestValidated(metadata) {
		
		dataServices.createCSR(localClientDir, local_client_fqdn).then(
			function onCsrCreated(csr) {
				
				provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));
				
				var postData = {
					csr: csr,
					uid: metadata.uid
				};
				
				var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);
				
				logger.printStandardEvent(BeameLogger.EntityLevel.LocalClient, BeameLogger.StandardFlowEvent.RequestingCerts, local_client_fqdn);
				
				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {
						logger.printStandardEvent(BeameLogger.EntityLevel.LocalClient, BeameLogger.StandardFlowEvent.ReceivedCerts, local_client_fqdn);
						
						dataServices.saveCerts(beameUtils.makePath(localClientDir, '/'), payload, callback);
					}
					else {
						error.data.hostname = local_client_fqdn;
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
	function onEdgePathReceived(data) {
		
		localClientDir = data['path'];
		atomDir = data['parent_path'];
		
		isRequestValid(atom_fqdn, atomDir, localClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}
	
	
	beameUtils.findHostPathAndParentAsync(local_client_fqdn).then(onEdgePathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
	
};


var LocalClientServices = function () {
};

/**
 *
 * @param {String} atom_fqdn
 * @param {String|null} [edge_client_fqdn]
 * @param {Array} local_ips
 * @param {Function} callback
 */
LocalClientServices.prototype.registerLocalEdgeClients = function (atom_fqdn, edge_client_fqdn, local_ips, callback) {
	
	logger.info(`Call Register Local Edge Clients for ${JSON.stringify(local_ips)}`, {"atom": atom_fqdn});
	
	if (_.isEmpty(atom_fqdn)) {
		callback(logger.formatErrorMessage("Create Edge Client => Atom fqdn required", module_name), null);
		return;
	}
	
	var errorMessage = null,
		isSuccess = true,
		totalAddressesFound = local_ips.length,
		host_names = [],
		cnt = 0;
	
	
	for (var i = 0; i < totalAddressesFound; i++) {
		
		logger.info(`Calling Local Edge Client registered for ${local_ips[i]}`);
		
		registerLocalClient(atom_fqdn, local_ips[i], edge_client_fqdn, function (error, payload) {
			
			logger.info(`Local Edge Client registered with payload ${JSON.stringify(payload)}  and error ${JSON.stringify(error)}`, {"atom": atom_fqdn});
			
			cnt++;
			
			if (error) {
				errorMessage += (error + ';');
				isSuccess = false;
			}
			else {
				host_names.push(payload);
			}
			
			if (cnt == totalAddressesFound) {
				logger.info(`registerLocalEdgeClients returning ${JSON.stringify(host_names)}`);
				isSuccess ? callback(null, host_names) : callback(errorMessage, null);
			}
		});
	}
	
};

/**
 *
 * @param {String} atom_fqdn
 * @param {String|null|undefined} [edgeClientFqdn]
 * @param {Function} callback
 */
LocalClientServices.prototype.createLocalClients = function (atom_fqdn, edgeClientFqdn, callback) {
	var self = this;
	
	logger.debug("Call Create Local Clients", {
		"atom": atom_fqdn
	});
	
	if (_.isEmpty(atom_fqdn)) {
		callback(logger.formatErrorMessage("Create Local Client => Atom fqdn required", module_name), null);
		return;
	}
	
	beameUtils.getLocalActiveInterfaces().then(function (addresses) {
		var errorMessage = null,
			isSuccess = true,
			totalAddressesFound = addresses.length;
		
		
		for (var i = 0; i < totalAddressesFound; i++) {
			self.createLocalClient(atom_fqdn, addresses[i], edgeClientFqdn, _.bind(function (current, error) {
				if (error) {
					errorMessage += (error + ';');
					isSuccess = false;
				}
				if (current + 1 == totalAddressesFound) {
					isSuccess ? callback(null, addresses.length + ' local clients created') : callback(errorMessage, null);
				}
				
			}, null, i));
		}
		
	}, function (error) {
		callbacks(error, null);
	})
};

/**
 *
 * @param {String} atom_fqdn
 * @param {String} localIp
 * @param {String|null} [edgeClientFqdn]
 * @param {Function} callback
 */
LocalClientServices.prototype.createLocalClient = function (atom_fqdn, localIp, edgeClientFqdn, callback) {
	
	logger.debug("Call Create Local Client", {
		"atom": atom_fqdn
	});
	
	
	if (_.isEmpty(atom_fqdn)) {
		callback(logger.formatErrorMessage("Create Local Client => Atom fqdn required", module_name), null);
		return;
	}
	if (_.isEmpty(localIp)) {
		
		callback(logger.formatErrorMessage("Create Local Client => localIP required", module_name), null);
		return;
	}
	
	function onLocalClientRegistered(error, payload) {
		if (!error) {
			
			if (payload && payload.hostname) {
				var hostname = payload.hostname;
				
				getCert(atom_fqdn, hostname, function (error) {
					if (callback) {
						error ? callback(error, null) : callback(null, payload);
					}
				});
			}
			else {
				logger.error("unexpected error", payload);
			}
			
		}
		else {
			logger.fatal(error);
			callback && callback(error, null);
		}
	}
	
	registerLocalClient(atom_fqdn, localIp, edgeClientFqdn, onLocalClientRegistered);
	
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
					csr: csr
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
						callback(error, null);
					}
				});
				
			},
			function onCsrCreationFailed(error) {
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
