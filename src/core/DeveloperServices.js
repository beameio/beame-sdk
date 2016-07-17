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

new (require('../services/BeameStore'))();

var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.DeveloperApi;

/**
 * @typedef {Object} CompleteRegistrationRequestToken
 * @property {String} csr
 * @property {String} uid
 * @property {String} hostname
 */

/**
 * @typedef {Object} DeveloperRestoreCertRequestToken
 * @property {String} csr
 * @property {String} recovery_code
 * @property {String} hostname
 */

/**-----------------Private services----------------**/
/**
 *
 * @param {String|null|undefined} [developerName]
 * @param {String} email
 * @param {Function} callback
 */
var saveDeveloper = function (email, developerName, callback) {

    provisionApi.setAuthData(beameUtils.getAuthToken(homedir, global.authData.PK_PATH, global.authData.CERT_PATH));

    var postData = {
        name: developerName,
        email: email
    };

    var apiData = beameUtils.getApiData(apiActions.CreateDeveloper.endpoint, postData, true);

    provisionApi.runRestfulAPI(apiData, function (error, payload) {
        if (!error) {

            payload.name = developerName;
            payload.email = email;

            var devDir = beameUtils.makePath(devPath, payload.hostname + '/');

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
            //console.error(error);
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
    var devDir = beameUtils.makePath(devPath, hostname + "/");

    if (_.isEmpty(hostname)) {
        errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.HostnameRequired, "Get developer certs, hostname missing", {"error": "hostname missing"});
        //console.error(errMsg);
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
                        //console.error(error);
                        callback(error, null);
                    }
                });

            },
            function onCsrCreationFailed(error) {
                //console.error(error);
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

};

/**
 * Register developer => Receive developer Certs => Update developer profile
 * @param {String} developerName
 * @param {String} developerEmail
 * @param {Function} callback
 */
DeveloperServices.prototype.createDeveloper = function (developerName, developerEmail, callback) {

    var debugMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.DebugInfo, "Call Create Developer", {
        "name": developerName,
        "email": developerEmail
    });
    debug(debugMsg);

    saveDeveloper(developerEmail, developerName, function (error, payload) {
        if (!error) {

            var hostname = payload.hostname;

            getCert(hostname, function (error) {
                if (!error) {
                    //self.updateProfile(hostname, developerEmail, developerName, callback);
                    callback && callback(null, payload);
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
DeveloperServices.prototype.completeDeveloperRegistration = function (hostname, uid, callback) {
    var errMsg;

    if (_.isEmpty(hostname)) {
        errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.HostnameRequired, "Get developer certs, hostname missing", {"error": "hostname missing"});
        //console.error(errMsg);
        callback && callback(errMsg, null);
        return;
    }

    var devDir = beameUtils.makePath(devPath, hostname + "/");

    dataServices.createDir(devDir);

    /** @type {typeof CompleteRegistrationRequestToken} **/
    var payload = {
        hostname: hostname,
        uid: uid,
        name: hostname,
        email: hostname
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

                var postData = {
                    csr: csr,
                    hostname: metadata.hostname,
                    uid: metadata.uid
                };

                var apiData = beameUtils.getApiData(apiActions.CompleteRegistration.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {

                        dataServices.saveCerts(devDir, payload, callback);
                    }
                    else {
                        error.data.hostname = hostname;
                        //console.error(error);
                        callback(error, null);
                    }
                });

            },
            function onCsrCreationFailed(error) {
                //console.error(error);
                callback && callback(error, null);
            });
    }

};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} hostname => developer hostname
 * @param {String} email
 * @param {String|null|undefined} [name]
 * @param {Function} callback
 */
DeveloperServices.prototype.updateProfile = function (hostname, email, name, callback) {
    var devDir = beameUtils.makePath(devPath, hostname + "/");

    /*---------- private callbacks -------------------*/
    function onMetadataReceived(metadata) {

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
                //console.error(error);
                callback(error, null);
            }
        });


    }

    function onCertsValidated() {
        /*---------- read developer data and proceed -------------*/
        beameUtils.getNodeMetadata(devDir, hostname, global.AppModules.Developer).then(onMetadataReceived, onValidationError);
    }

    function onValidationError(error) {
        callback(error, null);
    }

    beameUtils.isNodeCertsExists(devDir, global.ResponseKeys.NodeFiles, global.AppModules.Developer, hostname, global.AppModules.Developer).then(onCertsValidated, onValidationError);

};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.renewCert = function (hostname, callback) {
    var devDir = beameUtils.makePath(devPath, hostname + "/");

    /*---------- private callbacks -------------------*/
    function onMetadataReceived() {

        provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        dataServices.createCSR(devDir, hostname, global.CertFileNames.TEMP_PRIVATE_KEY).then(
            function onCsrCreated(csr) {

                var postData = {
                    csr: csr
                };

                var apiData = beameUtils.getApiData(apiActions.RenewCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {

                        dataServices.renameFile(devDir, global.CertFileNames.TEMP_PRIVATE_KEY, global.CertFileNames.PRIVATE_KEY, function (error) {
                            if (!error) {
                                dataServices.saveCerts(devDir, payload, callback);
                            }
                            else {
                                callback && callback(error, null);
                            }
                        });

                    }
                    else {

                        dataServices.deleteFile(devDir, global.CertFileNames.TEMP_PRIVATE_KEY);

                        error.data.hostname = hostname;
                        //console.error(error);
                        callback(error, null);
                    }
                });

            },
            function onCsrCreationFailed(error) {
                //console.error(error);
                callback && callback(error, null);
            });
    }

    function onCertsValidated() {
        /*---------- read developer data and proceed -------------*/
        beameUtils.getNodeMetadata(devDir, hostname, global.AppModules.Developer).then(onMetadataReceived, onValidationError);
    }

    function onValidationError(error) {
        callback(error, null);
    }

    beameUtils.isNodeCertsExists(devDir, global.ResponseKeys.NodeFiles, global.AppModules.Developer, hostname, global.AppModules.Developer).then(onCertsValidated, onValidationError);
};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.restoreCert = function (hostname, callback) {
    var errMsg;

    if (_.isEmpty(hostname)) {
        errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.HostnameRequired, "Get developer certs, hostname missing", {"error": "hostname missing"});
        //console.error(errMsg);
        callback && callback(errMsg, null);
        return;
    }

    var devDir = beameUtils.makePath(devPath, hostname + "/");

    var recoveryData = dataServices.readJSON(beameUtils.makePath(devDir, global.CertFileNames.RECOVERY));

    if (_.isEmpty(recoveryData)) {
        callback('Recovery code not found', null);
        return;
    }

    dataServices.createCSR(devDir, hostname).then(
        function onCsrCreated(csr) {


            /** @type {typeof DeveloperRestoreCertRequestToken} **/
            var postData = {
                csr: csr,
                hostname: hostname,
                recovery_code: recoveryData.recovery_code
            };

            var apiData = beameUtils.getApiData(apiActions.RestoreCert.endpoint, postData, true);

            provisionApi.runRestfulAPI(apiData, function (error, payload) {
                if (!error) {

                    dataServices.deleteFile(devDir, global.CertFileNames.RECOVERY);

                    dataServices.saveCerts(devDir, payload, callback);
                }
                else {
                    error.data.hostname = hostname;
                    //console.error(error);
                    callback(error, null);
                }
            });

        },
        function onCsrCreationFailed(error) {
            //console.error(error);
            callback && callback(error, null);
        });


};

/**
 *
 * @param {String} hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.revokeCert = function (hostname, callback) {
    var devDir = beameUtils.makePath(devPath, hostname + "/");

    /*---------- private callbacks -------------------*/
    function onMetaInfoReceived(metadata) {

        provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            hostname: hostname
        };

        var apiData = beameUtils.getApiData(apiActions.RevokeCert.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, function (error, payload) {
            if (!error) {

                //TODO delete old certs

                dataServices.saveFile(devDir, global.CertFileNames.RECOVERY, beameUtils.stringify(payload), function (error) {
                    if (!callback) return;

                    if (!error) {
                        callback(null, 'done');
                    }
                    else {
                        callback(error, null);
                    }
                });

                callback(null, metadata);
            }
            else {
                error.data.hostname = hostname;
                //console.error(error);
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
