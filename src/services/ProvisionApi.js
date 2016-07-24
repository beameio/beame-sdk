'use strict';
require('../utils/Globals');
var debug = require("debug")("./src/services/ProvisionApi.js");
var provisionSettings = require('../../config/ApiConfig.json');
var beameUtils = require('../utils/BeameUtils');

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
	//console.log('clear json %j',json);

	var jsonCleaned = {};

	Object.keys(json).map(function (k)  {
		//console.log('element is %j,val is %j, key is %j',json[k],val,k);
		if(k==='$id') return;
		if(!isObject(json[k])){
			jsonCleaned[k] = json[k];
		}

		var jsonProp = json[k];
		delete jsonProp['$id'];
		jsonCleaned[k] = jsonProp;
		//return jsonProp;
	});
	//console.log('cleared json %j',jsonCleaned);


	return jsonCleaned;
}

//private helpers
var parseProvisionResponse = function (error, response, body, type, callback) {
	var errMsg;
	if (!response) {
		callback && callback(new Error('empty response'), null);
		return;
	}

	if (error) {
		errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.ApiRestError, "Provision Api response error", {"error": error});
		callback(errMsg, null);
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
		errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.ApiRestError, payload.Message || "Provision Api response error", {
			"status": response.statusCode,
			"message": payload.Message || payload
		});
		console.error(errMsg);
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
	var errMsg;

	retries--;

	var onApiError = function (error) {
		errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.ApiRestError, "Provision Api post error", {
			"error": error,
			"url": url
		});
		console.error(errMsg);
		sleep = parseInt(sleep * (Math.random() + 1.5));

		setTimeout(function () {
			postToProvisionApi(url, options, type, retries, sleep, callback);
		}, sleep);


	};

	try {
		if (retries == 0) {
			var consoleMessage = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.ApiRestError, "Post to provision failed", {"url": url});
			console.error(consoleMessage);
			callback && callback(consoleMessage, null);
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
var getFromProvisionApi = function (url, options, type, retries, sleep,callback) {

	var errMsg;

	retries--;

	var onApiError = function (error) {
		errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.ApiRestError, "Provision Api get error", {
			"error": error,
			"url": url
		});
		console.error(errMsg);
		sleep = parseInt(sleep * (Math.random() + 1.5));

		setTimeout(function () {
			getFromProvisionApi(url, options, type, retries, sleep, callback);
		}, sleep);
	};

	try {
		if (retries == 0) {
			var consoleMessage = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.ApiRestError, "Get from provision failed", {"url": url});
			console.error(consoleMessage);
			callback && callback(consoleMessage, null);
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
	this.provApiEndpoint = beameUtils.isAmazon() ? provisionSettings.Endpoints.Online : provisionSettings.Endpoints.Local;
	debug(global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.DebugInfo, "Provision Api Constructor", {"endpoint": this.provApiEndpoint}));

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
 * @param {String|null,undefined} [method] ==>  POST | GET
 */
ProvApiService.prototype.runRestfulAPI = function (apiData, callback, method) {

	var options = _.extend(this.options || {}, {form: apiData.postData});
	var apiEndpoint = this.provApiEndpoint + apiData.api;
	debug('Posting to: ' + apiEndpoint);
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


module.exports = ProvApiService;
