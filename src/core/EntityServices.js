/**
 * Created by USER on 01/09/2016.
 */
"use strict";

/**
 * @typedef {Object} EntityRegistrationToken
 * @property {String|null} [name]
 * @property {String|null} [email]
 * @property {String|null} [local_ip]
 * @property {String|null} [edge_fqdn]
 * @property {String|null} [parent_fqdn]
 */

var fs = require('fs');

var config = require('../../config/Config');
const module_name = config.AppModules.BeameEntity;
var BeameLogger = require('../utils/Logger');
const logger_level = BeameLogger.EntityLevel.BeameEntity;
var logger = new BeameLogger(module_name);
var _ = require('underscore');
var path = require('path');
var os = require('os');
var home = os.homedir();
var homedir = home;
var credsRootDir = config.localCertsDirV2;

new (require('../services/BeameStore'))();

var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DirectoryServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.EntityApi;

var authData = {
	"PK_PATH": "/authData/pk.pem",
	"CERT_PATH": "/authData/x509.pem"
};

var getMetadata = function (fqdn, devDir, callback) {
	provisionApi.setAuthData(beameUtils.getAuthToken(devDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

	var apiData = beameUtils.getApiData(apiActions.GetMetadata.endpoint, {}, false);

	provisionApi.runRestfulAPI(apiData, callback, 'GET');
};
var makeEntityDir = function (fqdn) {
	return beameUtils.makePath(credsRootDir, fqdn + '/');
}


class EntityServices {
	constructor() {
		this.store                    = new (require('../services/BeameStoreV2'))();
		this.cred                     = null;
	}

	/**
	 *
	 * @param {String} parent_fqdn
	 * @param {FqdnMetadata} metadata
	 * @returns {Promise}
	 */
	createEntity(parent_fqdn,metadata) {
		metadata.parent_fqdn = parent_fqdn;
		return new Promise(
			(resolve, reject) => {

				this._createEntity(metadata,function(){})

			}
		);
	}

	/**
	 * @param {FqdnMetadata} metadata
	 * @param {Function} callback
	 */
	registerEntity(metadata, callback) {

		// if(metadata.parent_fqdn){
		// 	provisionApi.setAuthData(beameUtils.getAuthToken(path.join(credsRootDir,metadata.parent_fqdn), config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));
		// }
		// else{
		// 	provisionApi.setAuthData(beameUtils.getAuthToken(homedir, authData.PK_PATH, authData.CERT_PATH));
		// }
		//
		// var postData = this._formatRegisterPostData(metadata);
		//
		// var apiData = beameUtils.getApiData(apiActions.RegisterEntity.endpoint, postData, true);
		//
		// provisionApi.runRestfulAPI(apiData, function (error, payload) {
		// 	if (!error) {
		//
		// 		callback && callback(null, payload);
		//
		// 	}
		// 	else {
		// 		callback && callback(error, null);
		// 	}
		// });
			var self = this;
		var crypto       = require('../../src/cli/crypto');

		var authServerUri = 'https://bqnp2d2beqol13qn.h40d7vrwir2oxlnn.v1.d.beameio.net/node/auth/register';
		var sign = crypto.sign('huy', 'h40d7vrwir2oxlnn.mpk3nobb568nycf5.v1.d.beameio.net');

		provisionApi.postRequest(authServerUri, {
			name: 'Load Balancer'
		}, self.completeEntityRegistration.bind(self),JSON.stringify(sign));


	}

	completeEntityRegistration(error, payload) {


		var self = this;

		if (error) {
			logger.error('SSL Proxy not registered', error);
			return;
		}

		if (!payload) {
			logger.error('!!!!!!!!!!!!!!!!!!!!!!SSL Proxy data is empty', payload);
			return;
		}

		function onError(error) {
			logger.fatal(error);
		}

		self.store.getNewCredentials(payload.fqdn, payload.parent_fqdn, payload.sign).then(
			/**
			 *
			 * @param {Credential} cred
			 */
			cred => {
				cred.createCSR().then(
					function onCsrReceived(csr) {
						cred.getCert(csr, payload.sign).then(metadata => {
							self.metadata = metadata;
							//noinspection NodeModulesDependencies,ES6ModulesDependencies
							dataServices.saveFile(config.rootDir, config.metadataFileName, beameUtils.stringify(metadata), (error) => {
								if (error) {
									logger.error(error);
								}

							});
						}).catch(onError);
					}).catch(onError);
			}).catch(onError);

		// var fqdn = metadata["fqdn"];
		// var parent_fqdn = metadata["parent_fqdn"];
		//
		// if (_.isEmpty(fqdn)) {
		// 	callback && callback(logger.formatErrorMessage("Complete entity registration => fqdn required", module_name), null);
		// 	return;
		// }
		//
		//
		// logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registering, fqdn);
		//
		// var devDir = makeEntityDir(fqdn);
		//
		// dataServices.createDir(devDir);
		//
		// var payload = {
		// 	fqdn: fqdn
		// };
		//
		// dataServices.savePayload(devDir, payload, config.ResponseKeys.EntityCreateResponseKeys,  function (error) {
		// 	if (!callback) return;
		//
		// 	if (!error) {
		// 		dataServices.getNodeMetadataAsync(devDir, payload.fqdn, module_name).then(onMetadataReceived, callback);
		// 	}
		// 	else {
		// 		callback(error, null);
		// 	}
		// });
		//
		// /*---------- private callbacks -------------------*/
		// function onMetadataReceived(meta) {
		//
		// 	var store        = new (require('../../src/services/BeameStoreV2'))();
		// 	var creds = store.search(fqdn)[0];
		//
		//
		//     creds.createCSR().then(
		// 		function onCsrCreated(csr) {
		//
		// 			var postData = {
		// 				csr: csr,
		// 				fqdn: fqdn
		// 			};
		//
		// 			var apiData = beameUtils.getApiData(apiActions.CompleteRegistration.endpoint, postData, true);
		//
		// 			if(parent_fqdn){
		// 				provisionApi.setAuthData(beameUtils.getAuthToken(path.join(credsRootDir,parent_fqdn), config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));
		// 			}
		// 			else{
		// 				provisionApi.setAuthData(beameUtils.getAuthToken(homedir, authData.PK_PATH, authData.CERT_PATH));
		// 			}
		//
		// 			logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.RequestingCerts, fqdn);
		//
		// 			provisionApi.runRestfulAPI(apiData, function (error, payload) {
		// 				if (!error) {
		//
		// 					logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.ReceivedCerts, fqdn);
		//
		// 					dataServices.saveCerts(devDir, payload, function (error) {
		// 						if (!error) {
		// 							getMetadata(fqdn, devDir, function (error, payload) {
		// 								if (!error) {
		// 									dataServices.savePayload(devDir, payload, config.ResponseKeys.EntityMetadataKeys, function (error) {
		// 										if (!callback) return;
		//
		// 										if (!error) {
		// 											callback(null, payload);
		// 										}
		// 										else {
		// 											callback(error, null);
		// 										}
		// 									});
		// 								}
		// 								else {
		// 									callback(error, null);
		// 								}
		// 							});
		// 						}
		// 						else {
		// 							callback(error, null);
		// 						}
		// 					});
		// 				}
		// 				else {
		// 					error.data.hostname = fqdn;
		// 					callback(error, null);
		// 				}
		// 			});
		//
		// 		},
		// 		function onCsrCreationFailed(error) {
		// 			callback && callback(error, null);
		// 		});
		// }

	}

	/**
	 * @param {FqdnMetadata} metadata
	 * @param {Function} callback
	 */
	_createEntity(metadata, callback) {

		provisionApi.setAuthData(beameUtils.getAuthToken(homedir, authData.PK_PATH, authData.CERT_PATH));

		var postData = this._formatRegisterPostData(metadata);

		var apiData = beameUtils.getApiData(apiActions.CreateEntity.endpoint, postData, true);

		logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registering, email);

		provisionApi.runRestfulAPI(apiData, function (error, payload) {
			if (!error) {

				logger.printStandardEvent(logger_level, BeameLogger.StandardFlowEvent.Registered, payload.hostname);

				var devDir = makeEntityDir(payload.fqdn);

				dataServices.createDir(devDir);

				dataServices.savePayload(devDir, payload, config.ResponseKeys.EntityMetadataKeys, function (error) {
					if (!callback) return;

					if (!error) {
						dataServices.getNodeMetadataAsync(devDir, payload.fqdn, module_name).then(function (metadata) {
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

	}

	/**
	 *
	 * @param {FqdnMetadata} metadata
	 * @returns {EntityRegistrationToken}
	 * @private
	 */
	_formatRegisterPostData(metadata){
		return  {
			name: metadata.name,
			email: metadata.email,
			parent_fqdn: metadata.parent_fqdn,
			edgeFqdn: '',
			ip: metadata.local_ip
		};
	}
}


module.exports = EntityServices;