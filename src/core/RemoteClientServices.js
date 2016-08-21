/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';

var config        = require('../../config/Config');
const module_name = config.AppModules.EdgeClient;
var BeameLogger   = require('../utils/Logger');
var logger        = new BeameLogger(module_name);
var _             = require('underscore');
var provisionApi  = new (require('../services/ProvisionApi'))();
var dataServices  = new (require('../services/DataServices'))();
var beameUtils    = require('../utils/BeameUtils');
var apiActions    = require('../../config/ApiConfig.json').Actions.EdgeClient;
var atomServices = new (require('../../src/core/AtomServices'))();
var path          = require('path');
var fs          = require('fs');
var _			= require('underscore');
var refAtom = "https://";
var refAtomPath;
const refDeveloper = "remote-developer";
var remoteClientHostname;
var https = require('https');
	//"cl90gs9a2p57ykaa.tr86t6ghqvoxtj516ku6krz3y8f6fm4b.v1.beameio.net/";
var PATH_MISMATCH_DEFAULT_MSG = 'Edge folder not found';




/**
 * @param {String} hostname
 * @param {String|null} [edgeClientDir]
 * @param {boolean} validateEdgeHostname
 * @returns {Promise}
 */
var isRequestValid = function (hostname, edgeClientDir, validateEdgeHostname) {

	return new Promise(function (resolve, reject) {

		function onValidationError(error) {
			reject(error);
		}

		function onMetadataReceived(metadata) {
			resolve(metadata);
		}

		function getMetadata() {
			dataServices.getNodeMetadataAsync(edgeClientDir, hostname, module_name).then(onMetadataReceived).catch(onValidationError);
		}


		function validateEdgeClientHost() {
			if (validateEdgeHostname && _.isEmpty(hostname)) {
				reject(logger.formatErrorMessage("FQDN required", module_name));
			}
		}

		if (_.isEmpty(hostname)) {
			reject(logger.formatErrorMessage("FQDN required", module_name));
		}
		else {
			validateEdgeClientHost();
		}
	});
};

/**
 *
 * @param {Function} callback
 * @this {RemoteClientServices}
 */
var registerRemoteClient = function (callback) {

	/*---------- private callbacks -------------------*/
	function onEdgeSelectionError(error) {
		callback && callback(logger.formatErrorMessage("select best proxy error", module_name, error), null);
	}

	/** @param {EdgeShortData} edge  **/
	function onEdgeServerSelected(edge) {

		var postData = {
			host: refAtom
		};

		var apiData = beameUtils.getApiData(apiActions.CreateEdgeClient.endpoint, postData, true);

		logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.Registering, ` for atom ${atom_fqdn}`);

		provisionApi.runRestfulAPI(apiData, function (error, payload) {
			if (!error) {

				logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.Registered, payload.hostname);

				payload.parent_fqdn = atom_fqdn;

				var edgeClientDir = beameUtils.makePath(atomDir, payload.hostname + '/');

				dataServices.createDir(edgeClientDir);

				dataServices.savePayload(edgeClientDir, payload, config.ResponseKeys.EdgeClientResponseKeys, module_name, function (error) {
					if (!callback) return;

					if (!error) {

						dataServices.getNodeMetadataAsync(edgeClientDir, payload.hostname, module_name).then(function (metadata) {
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
	
	beameUtils.selectBestProxy(config.loadBalancerURL, 100, 1000, function (error, payload) {
		if (!error) {
			onEdgeServerSelected(payload);
		}
		else {
			onEdgeSelectionError(error);
		}
	});
	
};

/**
 *
 * @param {String} atom_fqdn
 * @param {String} edge_client_fqdn
 * @param {String} signature
 * @param {Function} callback
 * @this {RemoteClientServices}
 */
var getCert = function (atom_fqdn, edge_client_fqdn, signature, callback) {
	var edgeClientDir, atomDir;


	function onRequestValidated(metadata) {

		dataServices.createCSR(edgeClientDir, edge_client_fqdn).then(
			function onCsrCreated(csr) {

				//provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, config.CertFileNames.PRIVATE_KEY, config.CertFileNames.X509));

				var postData = {
					csr: csr,
					uid: metadata.uid
				};

				var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

				logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.RequestingCerts, edge_client_fqdn);

				provisionApi.runRestfulAPI(apiData, function (error, payload) {
					if (!error) {
						logger.printStandardEvent(BeameLogger.EntityLevel.EdgeClient, BeameLogger.StandardFlowEvent.ReceivedCerts, edge_client_fqdn);

						dataServices.saveCerts(beameUtils.makePath(edgeClientDir, '/'), payload, callback);
					}
					else {
						error.data.hostname = edge_client_fqdn;
						callback(error, null);
					}
				}, null, signature);

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

		edgeClientDir = data['path'];
		atomDir       = data['parent_path'];

		isRequestValid(atom_fqdn, edgeClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
	}


	beameUtils.findHostPathAndParentAsync(edge_client_fqdn).then(onEdgePathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};
/**
 *
 * @param {String} payload
 */
function createClientDir(payload) {
	var clientDir = beameUtils.makePath(config.localCertsDir, payload.hostname + '/');
	dataServices.createDir(clientDir);

	fs.writeFileSync(path.join(devDir, "metadata.json"), JSON.stringify(metadata));

	dataServices.savePayload(edgeClientDir, payload, config.ResponseKeys.EdgeClientResponseKeys, module_name, function (error) {
		/*if (!callback) return;

		if (!error) {

			dataServices.getNodeMetadataAsync(edgeClientDir, payload.hostname, module_name).then(function (metadata) {
				callback(null, metadata);
			}, callback);
		}
		else {
			callback(error, null);
		}*/
		return;
	});
}

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

	refAtomPath = atom_fqdn;
	refAtom += atom_fqdn;
	function onEdgeRegistered(error, payload) {
		if (!error) {

			if (payload && payload.hostname) {
				var hostname = payload.hostname;

				getCert(refAtomPath, hostname, payload.AuthToken, function (error) {
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
			callback && callback(error, null);
		}
	}
	//
	// registerRemoteClient(onEdgeRegistered);
	var options = {
		host: refAtomPath,
		port: 443,
		path: '/upload',
		method: 'POST'
	};

	var req2 = https.request(options, function(res) {
		if(res.statusCode != 200){
			logger.error('Failed to create edgeClient hostname\n'+'HEADERS: ' + JSON.stringify(res.headers));
		}
		else{
			res.setEncoding('utf8');
			res.on('data', function (data) {
				console.log('DATA:',data);
				var parsedData = JSON.parse(data);
				if(parsedData.method == config.AtomServerRequests.SignAuthToken){
					logger.info('Received Authentication: ' + parsedData.body.authToken);

					onEdgeRegistered(null,{"hostname":remoteClientHostname, "AuthToken":parsedData.body.authToken});
				}
				else{
					logger.error('Failed to create remote edgeClient');
				}
			});
		}
	});

	var req1 = https.request(options, function(res) {
		if(res.statusCode != 200){
			logger.error('Failed to create edgeClient hostname\n'+'HEADERS: ' + JSON.stringify(res.headers));
		}
		else{
			res.setEncoding('utf8');
			res.on('data', function (data) {
				console.log('DATA:',data);
				var parsedData = JSON.parse(data);
				if(parsedData.method == config.AtomServerRequests.AuthorizeToken){
					logger.info('Received Authorization: ' + parsedData.body.token);
					req2.end(`{"method":"${config.AtomServerRequests.SignAuthToken}","authToken":"${parsedData.body.token}",
				"fqdn":"${remoteClientHostname}"}`);
				}
				else{
					logger.error('Failed to create remote edgeClient');
				}
			});
		}
	});

	var req = https.request(options, function(res) {
		if(res.statusCode != 200){
			logger.error('Failed to create edgeClient hostname\n'+'HEADERS: ' + JSON.stringify(res.headers));
		}
		else{
			res.setEncoding('utf8');
			res.on('data', function (data) {
				console.log('DATA:',data);
				var parsedData = JSON.parse(data);
				if(parsedData.method == config.AtomServerRequests.GetHost){
					remoteClientHostname = parsedData.body.hostname;
					logger.info('Received Hostname: ' + remoteClientHostname);
					createClientDir(parsedData);
					req1.end(`{"method":"${config.AtomServerRequests.AuthorizeToken}","fqdn":"${remoteClientHostname}"}`);
				}
				else{
					logger.error('Failed to create remote edgeClient');
				}
			});
		}
	});


	//req.end(`{"method":"${config.AtomServerRequests.GetHost}"}`);

	provisionApi.postRequest(refAtom,`{"method":"${config.AtomServerRequests.GetHost}"}`,function(error,data){
		console.log('DATA:',data);
		var parsedData = JSON.parse(data);
		remoteClientHostname = parsedData.body.hostname;
		logger.info('Received Hostname: ' + remoteClientHostname);
		createClientDir(parsedData);
		provisionApi.postRequest(refAtom,`{"method":"${config.AtomServerRequests.AuthorizeToken}","fqdn":"${remoteClientHostname}"}`,function(error,data){
			
		});
	});
};


module.exports = RemoteClientServices;
