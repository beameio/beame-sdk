/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';
var path       = require('path');
var request    = require('request');
var _          = require('underscore');
var network    = require('network');
var os = require('os');
var beameStore = new (require('../services/BeameStore'))();
var config     = require('../../config/Config');


/**
 * @typedef {Object} AwsRegion
 * @property {String} Name
 * @property {String} Code
 */

/**
 * @type {AwsRegion[]}
 */
var AwsRegions = [
	{
		"Name": "EU (Ireland)",
		"Code": "eu-west-1"
	},
	{
		"Name": "Asia Pacific (Singapore)",
		"Code": "ap-southeast-1"
	},
	{
		"Name": "Asia Pacific (Sydney)",
		"Code": "ap-southeast-2"
	},
	{
		"Name": "EU (Frankfurt)",
		"Code": "eu-central-1"
	},
	{
		"Name": "Asia Pacific (Seoul)",
		"Code": "ap-northeast-2"
	},
	{
		"Name": "Asia Pacific (Tokyo)",
		"Code": "ap-northeast-1"
	},
	{
		"Name": "US East (N. Virginia)",
		"Code": "us-east-1"
	},
	{
		"Name": "South America (S?o Paulo)",
		"Code": "sa-east-1"
	},
	{
		"Name": "US West (N. California)",
		"Code": "us-west-1"
	},
	{
		"Name": "US West (Oregon)",
		"Code": "us-west-2"
	}
];

/**
 * @typedef {Object} AuthData
 * @property {String} pk => path to file
 * @property {String} x509 => path to file
 */

/**
 * @typedef {Object} ApiData
 * @property {Object} postData => post data to send to provision in JSON format
 * @property {String} api => api endpoint
 * @property {boolean} answerExpected => if response data expecting from provision
 */

/**
 * @typedef {Object} EdgeShortData
 * @property {String} endpoint
 * @property {String} region
 * @property {String} zone
 * @property {String} publicIp
 */

/**
 * @typedef {Object} DebugMessage
 * @param {String} module
 * @param {String} code
 * @param {String} message
 * @param {Object} data
 */

/**
 * @typedef {Object} ValidationResult
 * @param {boolean} isValid
 * @param {DebugMessage} message
 */

module.exports = {

	makePath: path.join,

	/**
	 *
	 * @param {String} module
	 * @param {String} code
	 * @param {String} message
	 * @param {Object} data
	 * @returns {typeof DebugMessage}
	 */
	formatDebugMessage: function (module, code, message, data) {
		return {
			module,
			code,
			message,
			data
		};
	},

	/**
	 * @param {String} baseDir
	 * @param {String} path2Pk
	 * @param {String} path2X509
	 * @returns {typeof AuthData}
	 */
	getAuthToken: function (baseDir, path2Pk, path2X509) {
		return {
			pk:   path.join(baseDir, path2Pk),
			x509: path.join(baseDir, path2X509)
		}
	},


	/**
	 * @param {String} projName
	 * @returns {string}
	 */
	// getProjHostName: function (projName) {
	//     var varName = "BEAME_PROJ_" + projName;
	//     var host = process.env[varName];
	//     if (host == undefined) {
	//         throw("Error: environment variable " + varName + " undefined, store project hostname in environment and rerun");
	//     }
	//     else
	//         return host;
	// },


	/**
	 * @param {String} endpoint
	 * @param {Object} postData
	 * @param {boolean} answerExpected
	 * @returns {typeof ApiData}
	 */
	getApiData: function (endpoint, postData, answerExpected) {
		return {
			api:            endpoint,
			postData:       postData,
			answerExpected: answerExpected
		};
	},


	getRegionName: function (hostname) {

		if (!hostname) return "Unknown";

		for (var i = 0; i < AwsRegions.length; i++) {
			var region = AwsRegions[i];
			if (hostname.lastIndexOf(region.Code) >= 0) {
				return region.Name;
			}
		}

		return "Unknown";
	},

	/**
	 *
	 * @param {String} url
	 * @param {Function|null} callback
	 */
	httpGet: function (url, callback) {
		request({
			url:  url,
			json: true
		}, function (error, response, body) {

			if (!error && response.statusCode === 200) {
				callback && callback(null, body);
			}
			else {
				callback && callback(error, null);
			}
		})
	},

	/**
	 *
	 * @param {String} loadBalancerEndpoint
	 * @param {Number} retries
	 * @param {Number} sleep
	 * @param {Function} callback
	 */
	selectBestProxy: function (loadBalancerEndpoint, retries, sleep, callback) {
		var self          = this;
		var getRegionName = self.getRegionName;
		var get           = self.httpGet;
		var selectBest    = self.selectBestProxy;
		var consoleMessage;

		if (retries == 0) {
			consoleMessage = self.formatDebugMessage(config.AppModules.EdgeClient, config.MessageCodes.EdgeLbError, "Edge not found", {"load balancer": loadBalancerEndpoint});
			console.error(consoleMessage);
			callback && callback(consoleMessage, null);
		}
		else {
			retries--;

			get(loadBalancerEndpoint + "/instance",
				/**
				 *
				 * @param error
				 * @param {Object} data
				 */
				function (error, data) {
					if (data) {
						//noinspection JSUnresolvedVariable
						var region = getRegionName(data.instanceData.endpoint);
						//noinspection JSUnresolvedVariable
						/** @type {EdgeShortData} edge **/
						var edge   = {
							endpoint: data.instanceData.endpoint,
							region:   region,
							zone:     data.instanceData.avlZone,
							publicIp: data.instanceData.publicipv4
						};

						callback && callback(null, edge);

					}
					else {

						sleep = parseInt(sleep * (Math.random() + 1.5));

						consoleMessage = self.formatDebugMessage(config.AppModules.EdgeClient, config.MessageCodes.EdgeLbError, "Retry to get lb instance", {
							"sleep":   sleep,
							"retries": retries
						});

						console.warn(consoleMessage);

						setTimeout(function () {
							selectBest.call(self, loadBalancerEndpoint, retries, sleep, callback);
						}, sleep);
					}
				});
		}

	},

	/**
	 *
	 * @param {Object} obj
	 */
	stringify: function (obj) {
		//noinspection NodeModulesDependencies,ES6ModulesDependencies
		return JSON.stringify(obj, null, 2);
	},

	/**
	 *
	 * @param {Number} length
	 * @returns {String}
	 */
	randomString: function (length) {
		var chars  = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
		var result = '';
		for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
		return result;
	},

	isAmazon: function () {
		return process.env.NODE_ENV ? true : false;
	},

	//validation services

	deleteHostCerts: function (fqdn, callback) {
		beameStore.shredCredentials(fqdn, callback || function () {
			});
	},

	/**
	 * @param hostname
	 * @returns {Promise.<ItemAndParentFolderPath>}
	 */
	findHostPathAndParentAsync: function (hostname) {

		return new Promise(function (resolve, reject) {
			var data = beameStore.searchItemAndParentFolderPath(hostname);

			if (!_.isEmpty(data)) {
				resolve(data);
			}
			else {
				reject('Not found');
			}
		});
	},

	/**
	 *
	 * @param {String} hostname
	 * @returns {String|null|undefined}
	 */
	findHostPathSync: function (hostname) {

		var data = beameStore.searchItemAndParentFolderPath(hostname);

		if (!_.isEmpty(data)) {
			return data["path"];
		}
		else {
			return null;
		}

	},

	/** ---------- Validation  shared services **/
	/**
	 *
	 * @param {Function} callback
	 * @param {Object} error
	 */
	onValidationError: function (callback, error) {
		callback && callback(error, null);
	},

	/**
	 *
	 * @param {Function} callback
	 * @param {String|null|undefined} [message]
	 */
	onSearchFailed: function (callback, message) {
		callback && callback(message, null);
	},

	/** local network**/
	getLocalActiveInterface: function (callback) {
		network.get_active_interface(function (error, obj) {
			if (!error && obj && obj.ip_address) {
				callback(null, obj.ip_address);
			}
			else {
				callback(error, null);
			}
		});
	},


	getLocalActiveInterfaces : function(){
		return new Promise(function (resolve, reject) {

			var addresses = [];

			var ifaces = os.networkInterfaces();

			Object.keys(ifaces).forEach(function (ifname) {

				ifaces[ifname].forEach(function (iface) {
					if(iface.family === 'IPv4' && iface.internal === false){
						addresses.push(iface.address);
					}

				});
			});

			addresses.length > 0 ? resolve(addresses) : reject('Local interfaces not found');
		});
	}
};
