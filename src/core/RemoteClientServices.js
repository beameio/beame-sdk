/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';
var _ = require('underscore');
var path = require('path');
var fs = require('fs');

var config = require('../../config/Config');
const module_name = config.AppModules.RemoteClient;
var BeameLogger = require('../utils/Logger');
var logger = new BeameLogger(module_name);
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiEdgeClientActions = require('../../config/ApiConfig.json').Actions.EdgeClient;
var apiLocalEdgeClientActions = require('../../config/ApiConfig.json').Actions.LocalClient;


var authenticationAtomFqdn, authenticationAtomUri, authorizationAtomFqdn, authorizationAtomUri, remoteClientHostname;

var https = require('https');

function toHttpsUri(fqdn) {
	return "https://" + fqdn;
}

function initServersUris(authorization_atom_fqdn, authentication_atom_fqdn){
	authenticationAtomFqdn = authentication_atom_fqdn || config.AuthenticationAtomFqdn;
	authenticationAtomUri = toHttpsUri(authenticationAtomFqdn);
	
	authorizationAtomFqdn = authorization_atom_fqdn || config.AuthorizationAtomFqdn;
	authorizationAtomUri = toHttpsUri(authorizationAtomFqdn);
}

/**
 *
 * @param {Object} error
 * @param {Function} callback
 */
function onError (error,callback) {
	logger.error(error.message, error);
	callback(error, null);
}

function registerHost(module, callback, edge_metadata, error, payload){
	
	var edgeClientDir, metadata = {};
	
	var getCerts = function (signature) {
		dataServices.createCSR(edgeClientDir, remoteClientHostname).then(
			function onCsrCreated(csr) {
				
				var postData = {
					csr: csr,
					atomFqdn: authenticationAtomFqdn,
					uid: metadata.uid
				};
				
				var getCertsUrl;
				
				switch (module){
					case config.AppModules.RemoteClient:
						getCertsUrl = apiEdgeClientActions.GetRemoteCert.endpoint;
						break;
					case config.AppModules.LocalClient:
						getCertsUrl = apiLocalEdgeClientActions.GetRemoteCert.endpoint;
						break;
					default:
						return onError("Invalid Edge client type",callback);
				}
				
				var apiData = beameUtils.getApiData(getCertsUrl, postData, true);
				
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
					return onError(error, callback);
				}
				
				var signature = payload.body.authToken;
				
				if (!signature) {
					return onError({message: "Signature not valid"}, callback);
				}
				
				getCerts(signature);
			});
	};
	
	var getAuthorizationToken = function (remoteClientHostname) {
		var data = `{"method":"${config.AtomServerRequests.AuthorizeToken}",
					"fqdn":"${remoteClientHostname}"}`;
		
		provisionApi.postRequest(authorizationAtomUri, data, function (error, payload) {
			if (error) {
				return onError(error, callback);
			}
			
			var authToken = payload.body.token;
			
			if (!authToken) {
				return onError({message: "Authorization token not valid"}, callback);
			}
			
			getSignature(remoteClientHostname, authToken, authorizationAtomFqdn);
		});
	};
	
	if (error) {
		return onError(error, callback);
	}
	
	metadata = edge_metadata || payload.body;
	remoteClientHostname = metadata.hostname;
	var payload_keys = [], level;
	
	switch (module){
		case config.AppModules.RemoteClient:
			payload_keys = config.ResponseKeys.EdgeClientResponseKeys;
			level = metadata.level;
			break;
		case config.AppModules.LocalClient:
			payload_keys = config.ResponseKeys.LocalClientResponseKeys;
			//TODO hack , before .beame becomes flat
			level = config.AppModules.RemoteClient;
			break;
		default:
			return onError("Invalid Edge client type", callback);
	}
	
	
	logger.printStandardEvent(module_name, BeameLogger.StandardFlowEvent.Registering, remoteClientHostname);
	
	edgeClientDir = beameUtils.makePath(config.localCertsDir, remoteClientHostname + '/');
	
	dataServices.createDir(edgeClientDir);
	
	dataServices.savePayload(edgeClientDir, metadata, payload_keys, level, function (error) {
		if (error) {
			return onError(error, callback);
		}
		
		getAuthorizationToken(remoteClientHostname);
	});
}

var RemoteClientServices = function () {
};

/**
 *
 * @param {Function} callback
 * @param {String} [edge_client_fqdn]
 * @param {String} [authorization_atom_fqdn]
 * @param {String} [authentication_atom_fqdn]
 */
RemoteClientServices.prototype.createLocalEdgeClients = function (callback, edge_client_fqdn ,authorization_atom_fqdn, authentication_atom_fqdn) {
	
	initServersUris(authorization_atom_fqdn, authentication_atom_fqdn);
	
	var onHostsReceived = function (error, payload) {
		
		if (error) {
			return onError(error, callback);
		}
		
		payload.body.forEach(metadata=>{
			registerHost(config.AppModules.LocalClient,callback,metadata,null,null);
		});
	};
	
	
	beameUtils.getLocalActiveInterfaces().then(function (addresses) {
		provisionApi.postRequest(authenticationAtomUri, `{"method":"${config.AtomServerRequests.GetHostsForLocalClients}","local_ips":"${addresses.join()}","edge_fqdn":"${edge_client_fqdn}"}`, onHostsReceived);
		
	}, function (error) {
		callbacks(error, null);
	})
	
	
};

/**
 *
 * @param {Function} callback
 * @param {String} [authorization_atom_fqdn]
 * @param {String} [authentication_atom_fqdn]
 */
RemoteClientServices.prototype.createEdgeClient = function (callback, authorization_atom_fqdn, authentication_atom_fqdn) {
	
	initServersUris(authorization_atom_fqdn, authentication_atom_fqdn);
	
	provisionApi.postRequest(authenticationAtomUri, `{"method":"${config.AtomServerRequests.GetHost}"}`, _.bind(registerHost, null, config.AppModules.RemoteClient, callback, null));
};

module.exports = RemoteClientServices;
