/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';
require('./Globals');
var path = require('path');
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

    makePath : function(baseDir,folder){
        return path.join(baseDir,folder);
    },

    /**
     * @param {String} baseDir
     * @param {String} path2Pk
     * @param {String} path2X509
     * @returns {typeof AuthData}
     */
    getAuthToken: function (baseDir,path2Pk, path2X509) {
        return {
            pk: path.join(baseDir,path2Pk),
            x509: path.join(baseDir,path2X509)
        }
    },


    /**
     * @param {String} projName
     * @returns {string}
     */
    getProjHostName: function (projName) {
        var varName = "BEAME_PROJ_"+projName;
        var host = process.env[varName];
        if(host == undefined){
            throw("Error: environment variable " + varName + " undefined, store project hostname in environment and rerun");
        }
        else
        return host;
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
     * @param {Number} retries
     * @param {Number} sleep
     * @returns {Promise.<typeof EdgeShortData>}
     */
    selectBestProxy: function (loadBalancerEndpoint,retries, sleep) {
        var self = this;
        var getRegionName = self.getRegionName;
        var get = self.httpGet;
        var selectBest =  self.selectBestProxy;
        var consoleMessage;
        return new Promise(function (resolve, reject) {


            if(retries == 0){
                consoleMessage = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.EdgeLbError, "Edge not found", {"load balancer": loadBalancerEndpoint});
                console.error(consoleMessage);
                reject(consoleMessage);
            }
            else{
                retries --;

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

                        consoleMessage = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.EdgeLbError, "lb instance found", edge);

                        console.log(consoleMessage);

                        resolve(edge);
                    }
                    else {

                        sleep = sleep * (Math.random()+1.5);

                        consoleMessage = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.EdgeLbError, "Retry to get lb instance", {"sleep": sleep, "retries" : retries});

                        console.warn(consoleMessage);

                        setTimeout(function(){
                            selectBest.call(self, loadBalancerEndpoint, retries, sleep);
                        },sleep);


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

            var developerMetadataPath = path.join(devDir,global.metadataFileName);
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
