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
	
	var getCerts = function(signature){
		dataServices.createCSR(edgeClientDir, remoteClientHostname).then(
			function onCsrCreated(csr) {
				
				var postData = {
					csr: csr,
					uid: metadata.uid
				};
				
				var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);
				
				logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.RequestingCerts, remoteClientHostname);
				
				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {
						logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.ReceivedCerts, remoteClientHostname);
						
						dataServices.saveCerts(beameUtils.makePath(edgeClientDir, '/'), payload, callback);
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
	
	var getSignature = function (remoteClientHostname, authToken) {
		provisionApi.postRequest(refAtomUri, `{"method":"${config.AtomServerRequests.SignAuthToken}","authToken":"${authToken}", "fqdn":"${remoteClientHostname}"}`, function (error, payload) {
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
		provisionApi.postRequest(refAtomUri, `{"method":"${config.AtomServerRequests.AuthorizeToken}","fqdn":"${remoteClientHostname}"}`, function (error, payload) {
			if (error) {
				return onError(error);
			}
			
			var authToken = payload.body.token;
			
			if (!authToken) {
				return onError({message: "Authorization token not valid"});
			}
			
			getSignature(remoteClientHostname, authToken);
		});
	};
	
	var onHostReceived = function (error, payload) {
		
		if (error) {
			return onError(error);
		}
		
		metadata = payload.body;
		remoteClientHostname = payload.body.hostname;
		
		logger.printStandardEvent(module_name, BeameLogger.StandardFlowEvent.Registered, remoteClientHostname);
		
		edgeClientDir = beameUtils.makePath(remoteClientHostname + '/');
		
		dataServices.createDir(edgeClientDir);
		
		dataServices.savePayload(edgeClientDir, metadata, config.ResponseKeys.EdgeClientResponseKeys, module_name, function (error) {
			
		});
		
		getAuthorizationToken(remoteClientHostname);
	};
	
	provisionApi.postRequest(refAtomUri, `{"method":"${config.AtomServerRequests.GetHost}"}`, onHostReceived);
};

module.exports = RemoteClientServices;
