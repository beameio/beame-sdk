/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';
var _ = require('underscore');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DirectoryServices'))();
var beameUtils = require('../utils/BeameUtils');
var crypto = require('../cli/crypto');
var fs = require('fs');
var apiActions = require('../../config/ApiConfig.json').Actions.AtomApi;
var config = require('../../config/Config');
const module_name = config.AppModules.Atom;
var BeameLogger = require('../utils/Logger');
var logger = new BeameLogger(module_name);

var PATH_MISMATCH_DEFAULT_MSG = 'Atom folder not found';

/**----------------------Private methods ------------------------  **/

var isRequestValid = function (hostname, devDir, atomDir, validateAppCerts) {

	return new Promise(function (resolve, reject) {
		function onValidationError(error) {
			reject(error);
		}

		function onMetadataReceived(metadata) {
			resolve(metadata);
		}

		function getMetadata() {
			dataServices.getNodeMetadataAsync(atomDir || devDir, hostname, module_name).then(onMetadataReceived, onValidationError);
		}

		function validateAtomCerts() {
			if (validateAppCerts) {
				dataServices.isNodeCertsExistsAsync(atomDir, config.ResponseKeys.NodeFiles, module_name, hostname, module_name).then(getMetadata, onValidationError);
			}
			else {
				getMetadata();
			}
		}

		function validateDevCerts() {
			dataServices.isNodeCertsExistsAsync(devDir, config.ResponseKeys.NodeFiles, module_name, hostname, config.AppModules.Developer).then(validateAtomCerts).catch(onValidationError);
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
 * @param {String} developerHostname
 * @param {String} atomName
 * @param {Boolean} makeRoutable => make atom routable
 * @param {Function} callback
 */
var registerAtom = function (developerHostname, atomName, makeRoutable, callback) {

	var devDir, edgeHostname = null;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			name: atomName,
			hostname: edgeHostname
		};

		var apiData = beameUtils.getApiData(apiActions.CreateAtom.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error, payload) {
			if (!error) {
				payload.name = atomName;
				payload.parent_fqdn = developerHostname;
				payload.edgeHostname = edgeHostname || "";

				var atomDir = beameUtils.makePath(devDir, payload.hostname + '/');

				dataServices.createDir(atomDir);

				dataServices.savePayload(atomDir, payload, config.ResponseKeys.AtomCreateResponseKeys, module_name, function (error) {
					if (!callback) return;

					if (!error) {
						dataServices.getNodeMetadataAsync(atomDir, payload.hostname, module_name).then(function (metadata) {
							callback(null, metadata);
						}, callback);
					}
					else {
						callback(error, null);
					}
				});
			}
			else {
				error.data.hostname = developerHostname;
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

		isRequestValid(developerHostname, devDir, null, false).then(function () {

			if (makeRoutable) {
				beameUtils.selectBestProxy(config.loadBalancerURL, 100, 1000, function (error, edge) {
					if (!error) {
						edgeHostname = edge.endpoint;
						onRequestValidated();
					}
					else {
						callback && callback(error);
					}
				});
			}
			else {
				onRequestValidated();
			}

		}).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(developerHostname).then(onDeveloperPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, 'Developer folder not found'));

};

/**
 *
 * @param {String} developerHostname
 * @param {String}  atom_fqdn
 * @param {Function} callback
 */
var getCert = function (developerHostname, atom_fqdn, callback) {
	var devDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated(metadata) {

		dataServices.createCSR(atomDir, atom_fqdn).then(
			function onCsrCreated(csr) {

				provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

				var postData = {
					csr: csr,
					uid: metadata.uid
				};

				var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

				logger.printStandardEvent(BeameLogger.EntityLevel.Atom, BeameLogger.StandardFlowEvent.RequestingCerts, atom_fqdn);

				provisionApi.runRestfulAPI(apiData,
					/**
					 * @param {LoggerMessage} error
					 * @param {Object} payload
					 */
					function (error, payload) {
						if (!error) {

							logger.printStandardEvent(BeameLogger.EntityLevel.Atom, BeameLogger.StandardFlowEvent.ReceivedCerts, atom_fqdn);

							dataServices.saveCerts(beameUtils.makePath(atomDir, '/'), payload, callback);
						}
						else {
							//noinspection JSUnresolvedVariable
							error.data.hostname = atom_fqdn;
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
	function onAtomPathReceived(data) {

		atomDir = data['path'];
		devDir = data['parent_path'];

		isRequestValid(developerHostname, devDir, atomDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(atom_fqdn).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};

/**
 *
 * @constructor
 */
var AtomServices = function () {
};

/**
 *
 * @param {String} developerHostname
 * @param {String} atomName
 * @param {Function} callback
 * @param {Boolean} [routable] => make atom routable, default = true
 */
AtomServices.prototype.createAtom = function (developerHostname, atomName, callback, routable) {
	logger.debug("Call Create Atom", {
		"developer": developerHostname,
		"name": atomName
	});

	var makeRoutable = routable || true;

	if (_.isEmpty(developerHostname)) {
		callback(logger.formatErrorMessage('Create Atom => Developer fqdn required', module_name), null);
		return;
	}

	if (_.isEmpty(atomName)) {
		callback(logger.formatErrorMessage('Create Atom => Atom name required', module_name), null);
		return;
	}

	logger.printStandardEvent(BeameLogger.EntityLevel.Atom, BeameLogger.StandardFlowEvent.Registering, atomName);

	function onAtomRegistered(error, payload) {
		if (!error) {

			var hostname = payload.hostname;

			logger.printStandardEvent(BeameLogger.EntityLevel.Atom, BeameLogger.StandardFlowEvent.Registered, `${atomName} with host ${hostname}`);

			getCert(developerHostname, hostname, function (error) {
				if (callback) {
					error ? callback(error, null) : callback(null, payload);
				}
			});
		}
		else {
			callback && callback(error, null);
		}
	}

	registerAtom(developerHostname, atomName, makeRoutable, onAtomRegistered);

};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} atomHostname
 * @param {String} atomName
 * @param {Function} callback
 */
AtomServices.prototype.updateAtom = function (atomHostname, atomName, callback) {
	var devDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated(metadata) {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			hostname: atomHostname,
			name: atomName
		};

		var apiData = beameUtils.getApiData(apiActions.UpdateAtom.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error) {
			if (!error) {
				metadata.name = atomName;
				dataServices.saveFile(atomDir, config.metadataFileName, beameUtils.stringify(metadata));
				callback && callback(null, metadata);
			}
			else {
				error.data.hostname = atomHostname;
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
		devDir = data['parent_path'];

		isRequestValid(atomHostname, devDir, atomDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};

//noinspection JSUnusedGlobalSymbols
/**
 * Update atom type, verified by developer license
 * @param {String} atomHostname
 * @param {AtomType} type
 * @param {Function} callback
 */
AtomServices.prototype.updateType = function (atomHostname, type, callback) {
	var devDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			hostname: atomHostname,
			type: type
		};

		var apiData = beameUtils.getApiData(apiActions.UpdateAtomType.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error) {
			if (!error) {
				callback && callback(null, {'updating atom type': 'done'});
			}
			else {
				error.data.hostname = atomHostname;
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
		devDir = data['parent_path'];

		isRequestValid(atomHostname, devDir, atomDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};

/**
 * Import external PK to .beame
 * @param {String} PKfilePath
 * @param {String} authSrvFqdn
 * @param {Function} callback
 */
AtomServices.prototype.importPKtoAtom = function (PKfilePath, authSrvFqdn, callback) {
	var fileContent = {};
	var msg;
	var PKsFile = beameUtils.makePath(config.remotePKsDir, config.PKsFileName);
	
	try {
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		fileContent = JSON.parse(fs.readFileSync(PKsFile));
		if (fileContent[authSrvFqdn].data) {
			msg = `PK already pinned for ${authSrvFqdn}`;
			logger.warn(msg);
			callback(null, {"message": msg});
			return;
		}
	}
	catch (e) {
		logger.info(`${PKsFile} is not there yet, will be created now`);
	}
	
	try {
		var PK = fs.readFileSync(PKfilePath);
		if (crypto.checkPK(PK)) {
			fileContent[authSrvFqdn] = String.fromCharCode.apply(null, PK);
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			fs.writeFileSync(PKsFile, JSON.stringify(fileContent));
			callback(null, {"message": "Key imported successfully"});
		}
		else {
			msg = `Provided PK in file *${PKfilePath}* is invalid`;
			callback({"message": msg}, null);
			logger.error(msg);
		}
	}
	catch (e) {
		msg = `Provided PK file *${PKfilePath}* does not exist, or the PK is invalid`;
		logger.error(msg);
		callback({"message": msg}, null);

	}
};

/**
 * Read PKs file
 * @param {Function} callback
 */
AtomServices.prototype.readPKsFile = function (callback) {
	var fileContent = {};
	var PKsFile = beameUtils.makePath(config.remotePKsDir, config.PKsFileName);
	try {
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		fileContent = JSON.parse(fs.readFileSync(PKsFile));
		callback(null,fileContent);
	}
	catch (e) {
		logger.error(`${PKsFile} does not exist`);
		callback(e,null)
	}
};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} atomHostname
 * @param {Function} callback
 */
AtomServices.prototype.deleteAtom = function (atomHostname, callback) {
	var devDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			hostname: atomHostname
		};

		var apiData = beameUtils.getApiData(apiActions.DeleteAtom.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error) {
			if (!error) {
				//delete atom folder
				dataServices.deleteFolder(atomDir, function (error) {
					if (!error) {
						callback(null, 'done');
						return;
					}

					callback && callback(error, null);
				});
			}
			else {
				error.data.hostname = atomHostname;
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
		devDir = data['parent_path'];

		isRequestValid(atomHostname, devDir, atomDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} atomHostname
 * @param {Function} callback
 */
AtomServices.prototype.renewCert = function (atomHostname, callback) {
	var devDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		dataServices.createCSR(atomDir, atomHostname, config.CertFileNames.TEMP_PRIVATE_KEY).then(
			function onCsrCreated(csr) {

				var postData = {
					hostname: atomHostname,
					csr: csr
				};

				var apiData = beameUtils.getApiData(apiActions.RenewCert.endpoint, postData, true);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {

						dataServices.renameFile(atomDir, config.CertFileNames.TEMP_PRIVATE_KEY, config.CertFileNames.PRIVATE_KEY, function (error) {
							if (!error) {
								dataServices.saveCerts(beameUtils.makePath(atomDir, '/'), payload, callback);
							}
							else {
								callback && callback(error, null);
							}
						});

					}
					else {
						dataServices.deleteFile(atomDir, config.CertFileNames.TEMP_PRIVATE_KEY);
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
	function onAtomPathReceived(data) {

		atomDir = data['path'];
		devDir = data['parent_path'];

		isRequestValid(atomHostname, devDir, atomDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}


	beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} atomHostname
 * @param {Function} callback
 */
AtomServices.prototype.revokeCert = function (atomHostname, callback) {
	var devDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			hostname: atomHostname
		};

		var apiData = beameUtils.getApiData(apiActions.RevokeCert.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, function (error) {
			if (!error) {

				beameUtils.deleteHostCerts(atomHostname);

				callback && callback(null, 'done');
			}
			else {
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
		devDir = data['parent_path'];

		isRequestValid(atomHostname, devDir, atomDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG))
};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} atomHostname
 * @param {Function} callback
 */
AtomServices.prototype.getStats = function (atomHostname, callback) {
	var devDir, atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			hostname: atomHostname
		};

		var apiData = beameUtils.getApiData(apiActions.GetStats.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, callback, 'GET');

	}

	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onAtomPathReceived(data) {

		atomDir = data['path'];
		devDir = data['parent_path'];

		isRequestValid(atomHostname, devDir, atomDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}

	beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};

//noinspection JSUnusedGlobalSymbols
/**
 * get atom creds
 * @param {string} atomHostname
 * @param {Function} callback
 */
AtomServices.prototype.getCreds = function (atomHostname, callback) {
	var atomDir;

	/*---------- private callbacks -------------------*/
	function onRequestValidated() {

		provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

		var postData = {
			hostname: atomHostname
		};

		var apiData = beameUtils.getApiData(apiActions.GetCreds.endpoint, postData, false);

		provisionApi.runRestfulAPI(apiData, callback, 'GET');

	}

	/**
	 *
	 * @param {ItemAndParentFolderPath} data
	 */
	function onAtomPathReceived(data) {

		atomDir = data['path'];
		
		onRequestValidated();
	}

	beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};

module.exports = AtomServices;