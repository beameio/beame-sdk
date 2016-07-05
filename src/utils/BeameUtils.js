/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';
require('./Globals');
var request = require('request');
var _ = require('underscore');
var dataServices = new (require('../services/DataServices'))();

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

    /**
     * @param {String} path2Pk
     * @param {String} path2X509
     * @returns {typeof AuthData}
     */
    getAuthToken: function (path2Pk, path2X509) {
        return {
            pk: path2Pk,
            x509: path2X509
        }
    },

    /**
     * @param {String} version
     * @param {String} endpoint
     * @param {Object} postData
     * @param {boolean} answerExpected
     * @returns {typeof ApiData}
     */
    getApiCallData: function (version, endpoint, postData, answerExpected) {
        return {
            version: version,
            api: endpoint,
            postData: postData,
            answerExpected: answerExpected
        };
    },

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
     * @returns {Promise.<typeof EdgeShortData>}
     */
    selectBestProxy: function (loadBalancerEndpoint) {
        var getRegionName = this.getRegionName;
        var get = this.httpGet;

        return new Promise(function (resolve, reject) {

            get(loadBalancerEndpoint + "/instance", function (error, data) {
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

                    var errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.EdgeLbError, "Edge not found", {"load balancer": loadBalancerEndpoint});
                    console.error(errMsg);
                    reject(errMsg);

                }
            });

        });
    },

    /**
     *
     * @param {Object} obj
     */
    stringify: function (obj) {
        return JSON.stringify(obj, null, 2);
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
    getNodeMetadata: function (devDir, hostname, module) {

        return new Promise(function (resolve, reject) {

            var developerMetadataPath = devDir + global.metadataFileName;
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
     * @param {String} path
     * @param {String} module
     * @param {String} hostname
     * @returns {Promise}
     */
    isHostnamePathValid: function (path, module, hostname) {

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
    isNodeCertsExists: function (path, nodeFiles, module, hostname, nodeLevel) {

        return new Promise(function (resolve, reject) {

            if (!dataServices.isNodeFilesExists(path, nodeFiles, module)) {
                var errMsg = global.formatDebugMessage(module, global.MessageCodes.NodeFilesMissing, nodeLevel + "files not found", {
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
    }
};
