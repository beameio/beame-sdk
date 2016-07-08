/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';
require('../utils/Globals');
var debug = require("debug")("./src/services/DeveloperServices.js");
var _ = require('underscore');
var path = require('path');
var homedir = global.__homedir;
var devPath = global.devPath;

var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.DeveloperApi;

/**-----------------Private services----------------**/
/**
 *
 * @param {String|null|undefined} [developerName]
 * @param {Function} callback
 */
var saveDeveloper = function (developerName, callback) {

    provisionApi.setAuthData(beameUtils.getAuthToken(homedir, global.authData.PK_PATH, global.authData.CERT_PATH));

    var postData = {
        name: developerName
    };

    var apiData = beameUtils.getApiData(apiActions.CreateDeveloper.endpoint, postData, true);

    provisionApi.runRestfulAPI(apiData, function (error, payload) {
        if (!error) {

            payload.name = developerName;

            var devDir = devPath + payload.hostname + '/';

            dataServices.createDir(devDir);

            dataServices.savePayload(devDir, payload, global.ResponseKeys.DeveloperCreateResponseKeys, global.AppModules.Developer, function (error) {
                if (!callback) return;

                if (!error) {
                    beameUtils.getNodeMetadata(devDir, payload.hostname, global.AppModules.Developer).then(function (metadata) {
                        callback(null, metadata);
                    }, callback);
                }
                else {
                    callback(error, null);
                }
            });

        }
        else {
            console.error(error);
            callback && callback(error, null);
        }

    });

};

/**
 *
 * @param {String} hostname => developer hostname
 * @param {Function} callback
 */
var getCert = function (hostname, callback) {
    var errMsg;
    var devDir = devPath + hostname + "/";

    if (_.isEmpty(hostname)) {
        errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.HostnameRequired, "Get developer certs, hostname missing", {"error": "hostname missing"});
        console.error(errMsg);
        callback && callback(errMsg, null);
        return;
    }

    /*---------- private callbacks -------------------*/
    function onMetadataReceived(metadata) {

        dataServices.createCSR(devDir, hostname).then(
            function onCsrCreated(csr) {

                provisionApi.setAuthData(beameUtils.getAuthToken(homedir, global.authData.PK_PATH, global.authData.CERT_PATH));

                var postData = {
                    csr: csr,
                    uid: metadata.uid
                };

                var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {

                        dataServices.saveCerts(devDir, payload, callback);
                    }
                    else {
                        error.data.hostname = hostname;
                        console.error(error);
                        callback(error, null);
                    }
                });

            },
            function onCsrCreationFailed(error) {
                console.error(error);
                callback && callback(error, null);
            });
    }

    function getDeveloperMetadata() {
        /*---------- read developer data and proceed -------------*/
        beameUtils.getNodeMetadata(devDir, hostname, global.AppModules.Developer).then(onMetadataReceived, onValidationError);
    }

    function onValidationError(error) {
        callback(error, null);
    }

    beameUtils.isHostnamePathValid(devDir, global.AppModules.Developer, hostname).then(getDeveloperMetadata, onValidationError);
};

/**
 * Developer services
 * @constructor
 */
var DeveloperServices = function () {

    dataServices.createDir(devPath);
};

/**
 * Register developer => Receive developer Certs => Update developer profile
 * @param {String} developerName
 * @param {String} developerEmail
 * @param {Function} callback
 */
DeveloperServices.prototype.createDeveloper = function (developerName, developerEmail, callback) {
    var self = this;

    var debugMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.DebugInfo, "Call Create Developer", {
        "name": developerName,
        "email": developerEmail
    });
    debug(debugMsg);

    saveDeveloper(developerName, function (error, payload) {
        if (!error) {

            var hostname = payload.hostname;

            getCert(hostname, function (error) {
                if (!error) {
                    self.updateProfile(hostname, developerEmail, developerName, callback);
                }
                else {
                    callback && callback(error, null);
                }
            });
        }
        else {
            callback && callback(error, null);
        }
    });
};

/**
 *
 * @param {String} hostname
 * @param {String} uid
 * @param {Function} callback
 */
DeveloperServices.prototype.completeDeveloperRegistration = function (hostname, uid,callback) {
    var errMsg;

    if (_.isEmpty(hostname)) {
        errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.HostnameRequired, "Get developer certs, hostname missing", {"error": "hostname missing"});
        console.error(errMsg);
        callback && callback(errMsg, null);
        return;
    }

    var devDir = devPath + hostname + "/";

    dataServices.createDir(devDir);

    var payload = {
        hostname : hostname,
        uid : uid,
        name : hostname
    };

    dataServices.savePayload(devDir, payload, global.ResponseKeys.DeveloperCreateResponseKeys, global.AppModules.Developer, function (error) {
        if (!callback) return;

        if (!error) {
            beameUtils.getNodeMetadata(devDir, payload.hostname, global.AppModules.Developer).then(onMetadataReceived, callback);
        }
        else {
            callback(error, null);
        }
    });

    /*---------- private callbacks -------------------*/
    function onMetadataReceived(metadata) {

        dataServices.createCSR(devDir, hostname).then(
            function onCsrCreated(csr) {

                provisionApi.setAuthData(beameUtils.getAuthToken(homedir, global.authData.PK_PATH, global.authData.CERT_PATH));

                var postData = {
                    csr: csr,
                    hostname : metadata.hostname,
                    uid: metadata.uid
                };

                var apiData = beameUtils.getApiData(apiActions.CompleteRegistration.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {

                        dataServices.saveCerts(devDir, payload, callback);
                    }
                    else {
                        error.data.hostname = hostname;
                        console.error(error);
                        callback(error, null);
                    }
                });

            },
            function onCsrCreationFailed(error) {
                console.error(error);
                callback && callback(error, null);
            });
    }

};


/**
 *
 * @param {String} hostname => developer hostname
 * @param {String} email
 * @param {String|null|undefined} [name]
 * @param {Function} callback
 */
DeveloperServices.prototype.updateProfile = function (hostname, email, name, callback) {
    var devDir = devPath + hostname + "/";

    /*---------- private callbacks -------------------*/
    function onMetaInfoReceived(metadata) {

        provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            email: email,
            name: name ? name : metadata.name
        };

        var apiData = beameUtils.getApiData(apiActions.UpdateProfile.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, function (error) {
            if (!error) {
                /*---------- update metadata -------------*/
                metadata.name = postData.name;
                metadata.email = email;

                dataServices.saveFile(devDir, global.metadataFileName, beameUtils.stringify(metadata));

                callback(null, metadata);
            }
            else {
                error.data.hostname = hostname;
                console.error(error);
                callback(error, null);
            }
        });


    }

    function onCertsValidated() {
        /*---------- read developer data and proceed -------------*/
        beameUtils.getNodeMetadata(devDir, hostname, global.AppModules.Developer).then(onMetaInfoReceived, onValidationError);
    }

    function onValidationError(error) {
        callback(error, null);
    }

    beameUtils.isNodeCertsExists(devDir, global.ResponseKeys.NodeFiles, global.AppModules.Developer, hostname, global.AppModules.Developer).then(onCertsValidated, onValidationError);

};

module.exports = DeveloperServices;
