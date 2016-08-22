/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';

var config = require('../../config/Config');
const module_name = config.AppModules.RemoteClient;
var BeameLogger = require('../utils/Logger');
var logger = new BeameLogger(module_name);
var _ = require('underscore');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.EdgeClient;
var path = require('path');
var fs = require('fs');

var refAtomUri = "https://";
var refAtomFqdn;
var remoteClientHostname;
var https = require('https');


var RemoteClientServices = function () {
};

/**
 *
 * @param {String} atom_fqdn
 * @param {Function} callback
 */
RemoteClientServices.prototype.createEdgeClient = function (atom_fqdn, callback) {
	
	logger.debug("Call Create Edge Client", {"atom": atom_fqdn});
	
	if (_.isEmpty(atom_fqdn)) {
		callback(logger.formatErrorMessage("Create Edge Client => Atom fqdn required", module_name), null);
		return;
	}
	
	refAtomFqdn = atom_fqdn;
	refAtomUri += atom_fqdn;
	var edgeClientDir, metadata = {};
	
	
	var onError = function (error) {
		logger.error(error.message, error);
		callback(error, null);
	};
	
	var getCerts = function (signature) {
		dataServices.createCSR(edgeClientDir, remoteClientHostname).then(
			function onCsrCreated(csr) {
				
				var postData = {
					csr: csr,
					atomFqdn: refAtomFqdn,
					uid: metadata.uid
				};
				
				var apiData = beameUtils.getApiData(apiActions.GetRemoteCert.endpoint, postData, true);
				
				logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.RequestingCerts, remoteClientHostname);
				
				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {
						logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.ReceivedCerts, remoteClientHostname);
						
						dataServices.saveCerts(beameUtils.makePath(edgeClientDir, '/'), payload, function (err, msg){
							if(!err){
								logger.printStandardEvent(module_name, BeameLogger.StandardFlowEvent.Registered, remoteClientHostname);
							}
							else {
								logger.error('Remote client creation failed at getting certs');
							}
						});
					}
					else {
						error.data.hostname = remoteClientHostname;
						callback(error, null);
					}
				}, null, signature);
			},
			function onCsrCreationFailed(error) {
				callback && callback(error, null);
			});
	};
	
	var getSignature = function (remoteClientHostname, authToken, authServer) {
		var data = `{"method":"${config.AtomServerRequests.SignAuthToken}",
					 "authServer":"${authServer}",
					 "authToken":"${authToken}", 
					 "fqdn":"${remoteClientHostname}"}`;
		
		provisionApi.postRequest(refAtomUri, data,
			function (error, payload) {
				if (error) {
					return onError(error);
				}
				
				var signature = payload.body.authToken;
				
				if (!signature) {
					return onError({message: "Signature not valid"});
				}
				
				getCerts(signature);
			});
	};
	
	var getAuthorizationToken = function (remoteClientHostname) {
		var data = `{"method":"${config.AtomServerRequests.AuthorizeToken}",
					"fqdn":"${remoteClientHostname}"}`;
		
		provisionApi.postRequest(refAtomUri, data, function (error, payload) {
			if (error) {
				return onError(error);
			}
			
			var authToken = payload.body.token;
			
			if (!authToken) {
				return onError({message: "Authorization token not valid"});
			}
			
			getSignature(remoteClientHostname, authToken, refAtomFqdn);
		});
	};
	
	var onHostReceived = function (error, payload) {
		
		if (error) {
			return onError(error);
		}
		
		metadata = payload.body;
		remoteClientHostname = payload.body.hostname;
		
		logger.printStandardEvent(module_name, BeameLogger.StandardFlowEvent.Registering, remoteClientHostname);
		
		edgeClientDir = beameUtils.makePath(config.localCertsDir, remoteClientHostname + '/');
		
		dataServices.createDir(edgeClientDir);
		
		dataServices.savePayload(edgeClientDir, metadata, config.ResponseKeys.EdgeClientResponseKeys, module_name, function (error) {
			if (error) {
				return onError(error);
			}

			getAuthorizationToken(remoteClientHostname);
		});
	};
	
	provisionApi.postRequest(refAtomUri, `{"method":"${config.AtomServerRequests.GetHost}"}`, onHostReceived);
};

module.exports = RemoteClientServices;
