/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';
require('./Globals');
var path = require('path');
var request = require('request');
var _ = require('underscore');
var dataServices = new (require('../services/DataServices'))();
var beameStore = new (require('../services/BeameStore'))();

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
 * @typedef {Object} ValidationResult
 * @param {boolean} isValid
 * @param {DebugMessage} message
 */

module.exports = {

	makePath: function (baseDir, folder) {
		return path.join(baseDir, folder);
	},

	/**
	 * @param {String} baseDir
	 * @param {String} path2Pk
	 * @param {String} path2X509
	 * @returns {typeof AuthData}
	 */
	getAuthToken: function (baseDir, path2Pk, path2X509) {
		return {
			pk: path.join(baseDir, path2Pk),
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
			api: endpoint,
			postData: postData,
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
			url: url,
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
	 * @returns {Promise.<typeof EdgeShortData>}
	 */
	selectBestProxy: function (loadBalancerEndpoint, retries, sleep) {
		var self = this;
		var getRegionName = self.getRegionName;
		var get = self.httpGet;
		var selectBest = self.selectBestProxy;
		var consoleMessage;
		return new Promise(function (resolve, reject) {


			if (retries == 0) {
				consoleMessage = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.EdgeLbError, "Edge not found", {"load balancer": loadBalancerEndpoint});
				console.error(consoleMessage);
				reject(consoleMessage);
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
							var region = getRegionName(data.instanceData.endpoint);

							var edge = {
								endpoint: data.instanceData.endpoint,
								region: region,
								zone: data.instanceData.avlZone,
								publicIp: data.instanceData.publicipv4
							};

							resolve(edge);
						}
						else {

							sleep = parseInt(sleep * (Math.random() + 1.5));

							consoleMessage = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.EdgeLbError, "Retry to get lb instance", {
								"sleep": sleep,
								"retries": retries
							});

							console.warn(consoleMessage);

							setTimeout(function () {
								selectBest.call(self, loadBalancerEndpoint, retries, sleep);
							}, sleep);


						}
					});
			}


		});
	},

	/**
	 *
	 * @param {Object} obj
	 */
	stringify: function (obj) {
		return JSON.stringify(obj, null, 2);
	},

	/**
	 *
	 * @param {Number} length
	 * @returns {String}
	 */
	randomString: function (length) {
		var chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
		var result = '';
		for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
		return result;
	},

	isAmazon: function () {
		return process.env.NODE_ENV ? true : false;
	},

	//validation services

	/**
	 * try read metadata file for node
	 * @param {String} devDir
	 * @param {String} hostname
	 * @param {String} module
	 * @returns {Promise.<Object>}
	 */
	getNodeMetadataAsync: function (devDir, hostname, module) {
		var self = this;

		return new Promise(function (resolve, reject) {

			var developerMetadataPath = self.makePath(devDir, global.metadataFileName);
			var metadata = dataServices.readJSON(developerMetadataPath);

			if (_.isEmpty(metadata)) {
				var errorJson = global.formatDebugMessage(module, global.MessageCodes.MetadataEmpty, "metadata.json for is empty", {"hostname": hostname});
				console.error(errorJson);
				reject(errorJson);
			}
			else {
				resolve(metadata);
			}

		});
	},

	/**
	 *
	 * @param {String} hostname
	 * @returns {Object}
	 */
	getHostMetadataSync: function (hostname) {
		var self = this;
		var data = beameStore.searchItemAndParentFolderPath(hostname);
		if (!_.isEmpty(data)) {
			var path = data['path'];

			if (!path) return false;

			var metadataPath = self.makePath(path, global.metadataFileName);
			var metadata = dataServices.readJSON(metadataPath);

			return _.isEmpty(metadata) ? null : metadata;

		}
		else {
			return null;
		}

	},

	/**
	 *
	 * @param {String} path
	 * @param {String} module
	 * @param {String} hostname
	 * @returns {Promise}
	 */
	isHostnamePathValidAsync: function (path, module, hostname) {

		return new Promise(function (resolve, reject) {

			if (!dataServices.isPathExists(path)) {//provided invalid hostname
				var errMsg = global.formatDebugMessage(module, global.MessageCodes.NodeFolderNotExists, "Provided hostname is invalid, list ./.beame to see existing hostnames", {"hostname": hostname});
				console.error(errMsg);
				reject(errMsg);
			}
			else {
				resolve(true);
			}
		});
	},

	/**
	 *
	 * @param {String} path
	 * @param {Array} nodeFiles
	 * @param {String} module
	 * @param {String} hostname
	 * @param {String} nodeLevel => Developer | Atom | EdgeClient
	 * @returns {Promise}
	 */
	isNodeCertsExistsAsync: function (path, nodeFiles, module, hostname, nodeLevel) {

		return new Promise(function (resolve, reject) {

			if (!dataServices.isNodeFilesExists(path, nodeFiles, module)) {
				var errMsg = global.formatDebugMessage(module, global.MessageCodes.NodeFilesMissing, nodeLevel + " files not found", {
					"level": nodeLevel,
					"hostname": hostname
				});
				console.error(errMsg);
				reject(errMsg);
			}
			else {
				resolve(true);
			}
		});
	},

	deleteHostCerts : function(fqdn,callback){
		beameStore.shredCredentials(fqdn,callback || function(){});
	},

	/**
	 *
	 * @param {String} hostname
	 * @param {Array} nodeFiles
	 * @param {String} module
	 * @returns {boolean}
	 */
	validateHostCertsSync: function (hostname, nodeFiles, module) {
		var data = beameStore.searchItemAndParentFolderPath(hostname);
		if (!_.isEmpty(data)) {
			var path = data['path'];

			if (!path) return false;

			return dataServices.isNodeFilesExists(path, nodeFiles, module);
		}
		else {
			return false;
		}
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
	}
};
