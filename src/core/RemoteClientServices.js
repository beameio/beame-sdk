/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';

var config = require('../../config/Config');
const module_name = config.AppModules.RemoteClient;
var BeameLogger = require('../utils/Logger');
var logger = new BeameLogger(module_name);
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.EdgeClient;
var path = require('path');
var fs = require('fs');

var authenticationAtomFqdn, authenticationAtomUri, authorizationAtomFqdn, authorizationAtomUri, remoteClientHostname;

var https = require('https');

function toHttpsUri(fqdn) {
	return "https://" + fqdn;
}

var RemoteClientServices = function () {
};

/**
 *
 * @param {Function} callback
 * @param {String} [authorization_atom_fqdn]
 * @param {String} [authentication_atom_fqdn]
 */
RemoteClientServices.prototype.createEdgeClient = function (callback, authorization_atom_fqdn, authentication_atom_fqdn) {
	
	authenticationAtomFqdn = authentication_atom_fqdn || config.AuthenticationAtomFqdn;
	authenticationAtomUri = toHttpsUri(authenticationAtomFqdn);
	
	authorizationAtomFqdn = authorization_atom_fqdn || config.AuthorizationAtomFqdn;
	authorizationAtomUri = toHttpsUri(authorizationAtomFqdn);
	
	
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
					atomFqdn: authenticationAtomFqdn,
					uid: metadata.uid
				};
				
				var apiData = beameUtils.getApiData(apiActions.GetRemoteCert.endpoint, postData, true);
				
				logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.RequestingCerts, remoteClientHostname);
				
				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {
						logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.ReceivedCerts, remoteClientHostname);
						
						dataServices.saveCerts(beameUtils.makePath(edgeClientDir, '/'), payload, function (error) {
							if (!error) {
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
		
		provisionApi.postRequest(authenticationAtomUri, data,
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
		
		provisionApi.postRequest(authorizationAtomUri, data, function (error, payload) {
			if (error) {
				return onError(error);
			}
			
			var authToken = payload.body.token;
			
			if (!authToken) {
				return onError({message: "Authorization token not valid"});
			}
			
			getSignature(remoteClientHostname, authToken, authorizationAtomFqdn);
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
	
	provisionApi.postRequest(authenticationAtomUri, `{"method":"${config.AtomServerRequests.GetHost}"}`, onHostReceived);
};

module.exports = RemoteClientServices;
