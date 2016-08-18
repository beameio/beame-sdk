"use strict";

var provisionSettings = require('../../config/ApiConfig.json');
var config = require('../../config/Config');
const module_name = config.AppModules.ProvisionApi;
var logger = new (require('../utils/Logger'))(module_name);
/**
 * @typedef {Object} CertSettings
 * @property {String} appCertPath
 * @property {String} x509Name
 * @property {String} pkName
 */

/**
 * @typedef {Object} OrderPemResponse
 * @property {String} x509
 * @property {String} ca
 * @property {String} pkcs7
 */

/**
 * @typedef {Object} ProvEndpointResponse
 * @property {String} uid
 * @property {String} hostname
 */


var _ = require('underscore');
var request = require('request');
var fs = require('fs');

function isObject(str) {
	try {
		return typeof str === 'object';
	} catch (e) {
		return false;
	}
}

function clearJSON(json) {
	
	var jsonCleaned = {};
	
	Object.keys(json).map(function (k) {
		if (k === '$id') return;
		if (!isObject(json[k])) {
			jsonCleaned[k] = json[k];
		}
		
		var jsonProp = json[k];
		delete jsonProp['$id'];
		jsonCleaned[k] = jsonProp;
		
	});
	
	return jsonCleaned;
}

//private helpers
var parseProvisionResponse = function (error, response, body, type, callback) {
	
	if (!response) {
		callback && callback(logger.formatErrorMessage("Provision Api => empty response", module_name, error, config.MessageCodes.ApiRestError), null);
		return;
	}
	
	if (error) {
		callback(logger.formatErrorMessage("Provision Api response error", module_name, error, config.MessageCodes.ApiRestError), null);
		return;
	}
	
	/** @type {Object|null|undefined} */
	var payload;
	
	if (body) {
		try {
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			payload = JSON.parse(body);
			
			payload = clearJSON(payload);
			
			//delete payload['$id'];
		}
		catch (err) {
			payload = {message: body};
		}
	}
	else {
		payload = response.statusCode == 200 ? {updateStatus: 'pass'} : "empty";
	}
	
	
	if (response.statusCode == 200) {
		
		callback && callback(null, payload);
	}
	else {
		//noinspection JSUnresolvedVariable
		var errMsg = logger.formatErrorMessage(payload.Message || "Provision Api response error", module_name, {
			"status": response.statusCode,
			"message": payload.Message || payload
		}, config.MessageCodes.ApiRestError);
		
		callback && callback(errMsg, null);
	}
	
};

/**
 *
 * @param {String} url
 * @param {Object} options
 * @param {String} type
 * @param {Number} retries
 * @param {Number} sleep
 * @param {Function} callback
 */
var postToProvisionApi = function (url, options, type, retries, sleep, callback) {
	
	retries--;
	
	var onApiError = function (error) {
		logger.warn("Provision Api post error", {
			"error": error,
			"url": url
		});
		
		sleep = parseInt(sleep * (Math.random() + 1.5));
		
		setTimeout(function () {
			postToProvisionApi(url, options, type, retries, sleep, callback);
		}, sleep);
		
		
	};
	
	try {
		if (retries == 0) {
			callback && callback(logger.formatErrorMessage("Post to provision failed", module_name, {
				url,
				options
			}, config.MessageCodes.ApiRestError), null);
		}
		else {
			request.post(
				url,
				options,
				function (error, response, body) {
					if (error) {
						onApiError(error);
					}
					else {
						parseProvisionResponse(error, response, body, type, function (error, payload) {
							if (payload) {
								callback(null, payload);
							}
							else {
								if (_.isEmpty(error.data)) {
									error.data = {};
								}
								error.data.url = url;
								error.data.postData = options.form;
								callback(error, null);
							}
						});
					}
					
				}
			);
		}
	}
	catch (error) {
		onApiError(error);
	}
	
};

/**
 *
 * @param {String} url
 * @param {Object} options
 * @param {String} type
 * @param {Number} retries
 * @param {Number} sleep
 * @param {Function} callback
 */
var getFromProvisionApi = function (url, options, type, retries, sleep, callback) {
	
	
	retries--;
	
	var onApiError = function (error) {
		logger.warn("Provision Api get error", {
			"error": error,
			"url": url
		});
		
		sleep = parseInt(sleep * (Math.random() + 1.5));
		
		setTimeout(function () {
			getFromProvisionApi(url, options, type, retries, sleep, callback);
		}, sleep);
	};
	
	try {
		if (retries == 0) {
			callback && callback(logger.formatErrorMessage("Get from provision failed", module_name, {
				url,
				options
			}, config.MessageCodes.ApiRestError), null);
		}
		else {
			request.get(
				url,
				options,
				function (error, response, body) {
					if (error) {
						onApiError(error);
					}
					else {
						parseProvisionResponse(error, response, body, type, function (error, payload) {
							if (payload) {
								callback(null, payload);
							}
							else {
								if (_.isEmpty(error.data)) {
									error.data = {};
								}
								error.data.url = url;
								error.data.postData = options.form;
								callback(error, null);
							}
						});
					}
					
				}
			);
		}
	}
	catch (error) {
		onApiError(error);
	}
	
};

/**
 * Empty constructor
 * @constructor
 */
var ProvApiService = function () {
	
	/** @member {String} **/
	this.provApiEndpoint = provisionSettings.Endpoints.BaseUrl;
	
};

/**
 *
 * @param {AuthData} authData
 */
ProvApiService.prototype.setAuthData = function (authData) {
	this.options = {
		key: fs.readFileSync(authData.pk),
		cert: fs.readFileSync(authData.x509)
	};
};

/**
 *
 * @param {ApiData} apiData
 * @param {Function} callback
 * @param {String|null} [method] ==>  POST | GET
 * @param {String|null} [signature]
 */
ProvApiService.prototype.runRestfulAPI = function (apiData, callback, method, signature) {
	
	var options = _.extend(this.options || {}, {form: apiData.postData});

	if (signature) {
		this.options.headers = {
			"AuthToken": signature
		};
	}

	var apiEndpoint = this.provApiEndpoint + apiData.api;
	logger.debug(`Api call to : ${apiEndpoint}`);
	var _method = method || 'POST';
	
	switch (_method) {
		case 'POST' :
			postToProvisionApi(apiEndpoint, options, apiData.api, provisionSettings.RetryAttempts, 1000, callback);
			return;
		case 'GET' :
			getFromProvisionApi(apiEndpoint, options, apiData.api, provisionSettings.RetryAttempts, 1000, callback);
			return;
		default:
			callback('Invalid method', null);
			return;
		
	}
};

/** **/
ProvApiService.prototype.postRequest = function (url ,postData, callback) {
	
	var options = _.extend(this.options || {}, {data: postData});
	
	request.post(
		url,
		options,
		function (error, response, body) {
			parseProvisionResponse(error, response, body, type, function (error, payload) {
				if (payload) {
					callback(null, payload);
				}
				else {
					if (_.isEmpty(error.data)) {
						error.data = {};
					}
					error.data.url = url;
					error.data.postData = options.form;
					callback(error, null);
				}
			});
			
		}
	);
};



module.exports = ProvApiService;
