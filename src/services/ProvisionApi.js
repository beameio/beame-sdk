"use strict";
const path = require('path');

const provisionSettings = require('../../config/ApiConfig.json');
const config            = require('../../config/Config');
const module_name       = config.AppModules.ProvisionApi;
const BeameLogger       = require('../utils/Logger');
const logger            = new BeameLogger(module_name);
const CommonUtils       = require('../utils/CommonUtils');
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


var _       = require('underscore');
var request = require('request');
var fs      = require('fs');


function clearJSON(json) {

	var jsonCleaned = {};

	Object.keys(json).map(function (k) {
		if (k === '$id') return;
		if (!CommonUtils.isObject(json[k])) {
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
		logger.error(`parse response error ${BeameLogger.formatError(error)} for type ${type}`, error, module_name);
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
		var msg    = payload.Message || payload.message || (payload.body && payload.body.message);
		var errMsg = logger.formatErrorMessage(msg || "Provision Api response error", module_name, {
			"status":  response.statusCode,
			"message": msg || payload
		}, config.MessageCodes.ApiRestError);

		logger.debug(`Provision error payload ${payload.toString()}`, payload);
		logger.debug(`Provision error response ${response.toString()}`, response);
		logger.debug(errMsg.message, payload);
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
			"url":   url
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
								error.data.url      = url;
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
		logger.warn(`Provision Api GET error on ${url}`, {
			"error": error,
			"url":   url
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
								error.data.url      = url;
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
 * Constructor
 * @param {String|null} [baseUrl]
 * @constructor
 */
class ProvApiService {

	constructor(baseUrl) {
		/** @member {String} **/
		this.provApiEndpoint = baseUrl || provisionSettings.Endpoints.BaseUrl;
	}


	/**
	 * @param {String} endpoint
	 * @param {Object} postData
	 * @returns {typeof ApiData}
	 */
	static getApiData(endpoint, postData) {
		return {
			api:      endpoint,
			postData: postData
		};
	}

	/**
	 * @param {Object} options
	 */
	static setUserAgent(options) {
		const os             = require('os');
		let headers          = options.headers || {},
		      agent          = {
			      sdk:    {
				      type:    'NodeJS',
				      version: require("../../package.json").version
			      },
			      platform: {
				      type:    os.platform(),
				      version: os.release()
			      }
		      };

		headers['X-BeameUserAgent'] = CommonUtils.stringify(agent);

		options.headers = headers;
		return options;
	}

	/**
	 *
	 * @param {Buffer} pk
	 * @param {Buffer} cert
	 */
	setClientCerts(pk, cert) {
		this.options = {
			key:  pk,
			cert: cert
		};
	}

	/**
	 *
	 * @param {ApiData} apiData
	 * @param {Function} callback
	 * @param {String|null} [method] ==>  POST | GET
	 * @param {String|null} [signature]
	 */
	runRestfulAPI(apiData, callback, method, signature) {

		this.options = this.options || {};

		var options = _.extend(this.options, {form: apiData.postData});

		if (signature) {
			this.options.headers = {
				"X-BeameAuthToken": signature
			};
		}

		var apiEndpoint = this.provApiEndpoint + apiData.api;
		logger.debug(`Api call to : ${apiEndpoint}`);
		var _method = method || 'POST';

		options = ProvApiService.setUserAgent(options);

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
	}

	/**
	 * Common post method for given url
	 * @param {String} url
	 * @param {Object} postData
	 * @param {Function} callback
	 * @param {String|null} [authToken]
	 * @param {Number|null} [retries]
	 */
	postRequest(url, postData, callback, authToken, retries) {
		var options     = _.extend(this.options || {}, {"form": postData});
		options.headers = {'Content-Type': 'application/x-www-form-urlencoded'};

		if (authToken) {
			options.headers = {
				"X-BeameAuthToken": authToken
			};
		}

		options = ProvApiService.setUserAgent(options);

		postToProvisionApi(url, options, "custom_post", retries || provisionSettings.RetryAttempts, 1000, callback);
	}

	static getRequest(url, callback) {
		getFromProvisionApi(url, {}, "custom_get", provisionSettings.RetryAttempts, 1000, callback);
	}
}


module.exports = ProvApiService;
