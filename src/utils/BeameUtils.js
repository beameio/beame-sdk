/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';
const path        = require('path');
const request     = require('request');
const network     = require('network');
const os          = require('os');
const config      = require('../../config/Config');
const module_name = config.AppModules.BeameUtils;
const BeameLogger = require('../utils/Logger');
const logger      = new BeameLogger(module_name);
const CommonUtils = require('../utils/CommonUtils');


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

//noinspection JSUnusedGlobalSymbols
/**
 * @typedef {Object} EdgeShortData
 * @property {String} endpoint
 * @property {String} region
 * @property {String} publicIp
 */

/**
 *
 * @param {Object} node
 * @param {Function} callback
 */
function iterateTree(node, callback) {
	callback(node);
	for(let k in node.children) {
		iterateTree(node.children[k], callback);
	}
}


/**
 *
 * @param {Object} node
 * @param {Function} predicate
 * @param {Number} limit
 * @returns {Array}
 */
function findInTree(node, predicate, limit) {

	var result = [];

	function allFoundException() {}

	function matchFound(x) {
		result.push(x);
		if(limit && result.length >= limit) {
			throw new allFoundException();
		}
	}

	try {
		iterateTree(node, x => {
			if(predicate(x)) {
				matchFound(x);
			}
		});
	} catch(e) {
		if(!(e instanceof allFoundException)) {
			throw e;
		}
	}

	return result;
}

module.exports = {

	makePath: path.join,


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
		var self       = this;
		var get        = self.httpGet;
		var selectBest = self.selectBestProxy;

		if (retries == 0) {
			callback && callback(logger.formatErrorMessage(`Edge not found on load-balancer ${loadBalancerEndpoint}`, config.AppModules.EdgeClient, null, config.MessageCodes.EdgeLbError), null);
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
						/** @type {EdgeShortData} edge **/
						var edge = {
							endpoint: data.instanceData.endpoint,
							publicIp: data.instanceData.publicipv4
						};

						callback && callback(null, edge);

					}
					else {

						sleep = parseInt(sleep * (Math.random() + 1.5));

						logger.warn("Retry to getMetadataKey lb instance", {
							"sleep":   sleep,
							"retries": retries
						});

						setTimeout(function () {
							selectBest.call(self, loadBalancerEndpoint, retries, sleep, callback);
						}, sleep);
					}
				});
		}

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

	//validation services

	/** ---------- Validation  shared services **/


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

	getLocalActiveInterfaces: function () {
		return new Promise(function (resolve, reject) {

			var addresses = [];

			var ifaces = os.networkInterfaces();

			Object.keys(ifaces).forEach(function (ifname) {

				ifaces[ifname].forEach(function (iface) {
					//noinspection JSUnresolvedVariable
					if (iface.family === 'IPv4' && iface.internal === false) {
						addresses.push(iface.address);
					}

				});
			});

			addresses.length > 0 ? resolve(addresses) : reject('Local interfaces not found');
		});
	},

	isAmazon: function () {
		return process.env.NODE_ENV ? true : false;
	},

	iterateTree,
	findInTree
};
