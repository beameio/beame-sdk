/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';
require('../utils/Globals');
var debug = require("debug")("./src/services/AtomServices.js");
var _ = require('underscore');
var devPath = global.devPath;

var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.AtomApi;


var validateDeveloperHost = function (developerHostname) {
    var errMsg;
    return new Promise(function (resolve, reject) {
        if (_.isEmpty(developerHostname)) {
            errMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.HostnameRequired, "Get atom certs, developer hostname missing", {"error": "developer hostname missing"});
            reject(errMsg);
            return;
        }

        resolve(true);
    });
};

var isAtomHostValid = function (appHostname) {
    var errMsg;
    return new Promise(function (resolve, reject) {

        if (_.isEmpty(appHostname)) {
            errMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.HostnameRequired, "Get atom certs, atom hostname missing", {"error": "atom hostname missing"});
            reject(errMsg);
            return;
        }
        resolve(true);
    });
};

var isRequestValid = function (developerHostname, appHostname, devDir, devAppDir, validateAppCerts) {

    return new Promise(function (resolve, reject) {
        function onValidationError(error) {
            reject(error);
        }

        function onMetadataReceived(metadata) {
            resolve(metadata);
        }

        function getMetadata() {
            beameUtils.getNodeMetadata(devAppDir || devDir, developerHostname, global.AppModules.Atom).then(onMetadataReceived, onValidationError);
        }

        function validateAtomCerts() {
            if (validateAppCerts) {
                beameUtils.isNodeCertsExists(devAppDir, global.ResponseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(getMetadata, onValidationError);
            }
            else {
                getMetadata();
            }
        }

        function validateDevCerts() {
            beameUtils.isNodeCertsExists(devDir, global.ResponseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(validateAtomCerts, onValidationError);
        }

        function validateAtomHost() {
            isAtomHostValid(appHostname).then(validateDevCerts, onValidationError);
        }

        validateDeveloperHost(developerHostname).then(validateAtomHost, onValidationError);
    });
};

/**
 *
 * @constructor
 */
var AtomServices = function () {
};

/**
 *
 * @param {String} developerHostname
 * @param {String} appName
 * @param {Function} callback
 */
AtomServices.prototype.createAtom = function (developerHostname, appName, callback) {
    var self = this;

    var debugMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.DebugInfo, "Call Create Atom", {
        "developer": developerHostname,
        "name": appName
    });
    debug(debugMsg);

    self.registerAtom(developerHostname, appName, function (error, payload) {
        if (!error) {

            var hostname = payload.hostname;

            self.getCert(developerHostname, hostname, function (error) {
                if (callback) {
                    error ? callback(error, null) : callback(null, payload);
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
 * @param {String} developerHostname
 * @param {String} appName
 * @param {Function} callback
 */
AtomServices.prototype.registerAtom = function (developerHostname, appName, callback) {

    var devDir = devPath + developerHostname + "/";

    /*---------- private callbacks -------------------*/
    function onRequestValidated(metadata) {
        var authData = beameUtils.getAuthToken(devDir + global.CertFileNames.PRIVATE_KEY, devDir + global.CertFileNames.X509, false, false, devDir, metadata.hostname);

        provisionApi.setAuthData(authData, function () {

            var postData = {
                name: appName
            };

            var apiData = beameUtils.getApiData(apiActions.CreateAtom.endpoint, postData, false);


            provisionApi.runRestfulAPI(apiData, function (error, payload) {
                if (!error) {
                    payload.name = appName;

                    var devAppDir = devDir + payload.hostname + '/';

                    dataServices.createDir(devAppDir);

                    dataServices.savePayload(devAppDir + global.metadataFileName, payload, global.ResponseKeys.AtomCreateResponseKeys, global.AppModules.Atom, function (error) {
                        if (!callback) return;

                        if (!error) {
                            beameUtils.getNodeMetadata(devAppDir, payload.hostname, global.AppModules.Atom).then(function(metadata){
                                callback(null, metadata);
                            }, callback);
                        }
                        else {
                            callback(error, null);
                        }
                    });
                }
                else {
                    error.data.hostname = developerHostname;
                    console.error(error);
                    callback(error, null);
                }
            });
        });

    }

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(developerHostname, "EMPTY DUMMY", devDir, null, false).then(onRequestValidated, onValidationError);
};

/**
 *
 * @param {String} developerHostname
 * @param {String}  appHostname
 * @param {Function} callback
 */
AtomServices.prototype.getCert = function (developerHostname, appHostname, callback) {
    var errMsg;
    var devDir = devPath + developerHostname + "/";
    var devAppDir = devDir + appHostname + "/";

    /*---------- private callbacks -------------------*/
    function onRequestValidated(metadata) {
        /*----------- generate RSA key + csr and post to provision ---------*/
        var authData = beameUtils.getAuthToken(devDir + global.CertFileNames.PRIVATE_KEY, devDir + global.CertFileNames.X509, true, true, devAppDir, appHostname);

        provisionApi.setAuthData(authData, function (csr) {
            if (!_.isEmpty(csr)) {

                var postData = {
                    csr: csr,
                    uid: metadata.uid
                };

                var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData,
                    /**
                     * @param {DebugMessage} error
                     * @param {Object} payload
                     */
                    function (error, payload) {
                        if (!error) {

                            dataServices.saveCerts(devAppDir, payload, callback);
                        }
                        else {
                            //noinspection JSUnresolvedVariable
                            error.data.hostname = appHostname;
                            console.error(error);
                            callback(error, null);
                        }
                    });
            }
            else {
                errMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.CSRCreationFailed, "CSR not created", {"hostname": hostname});
                console.error(errMsg);
                callback && callback(errMsg, null);
            }
        });
    }

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, devDir, devAppDir, false).then(onRequestValidated, onValidationError);

};

/**
 *
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {String} appName
 * @param {Function} callback
 */
AtomServices.prototype.updateAtom = function (developerHostname, appHostname, appName, callback) {
    var errMsg;
    var devDir = devPath + developerHostname + "/";
    var devAppDir = devDir + appHostname + "/";

    /*---------- private callbacks -------------------*/
    function onRequestValidated(metadata) {
        var authData = beameUtils.getAuthToken(devDir + global.CertFileNames.PRIVATE_KEY, devDir + global.CertFileNames.X509, false, false, devDir, developerHostname);

        provisionApi.setAuthData(authData, function () {
            var postData = {
                name: appName
            };

            var apiData = beameUtils.getApiData(apiActions.UpdateAtom.endpoint.replace(global.apiUIDTemplatePattern, metadata.uid), postData, false);

            provisionApi.runRestfulAPI(apiData, function (error) {
                if (!error) {
                    metadata.name = appName;
                    dataServices.saveFile(devAppDir + global.metadataFileName, beameUtils.stringify(metadata));
                    callback && callback(null, metadata);
                }
                else {
                    error.data.hostname = appHostname;
                    console.error(error);
                    callback && callback(error, null);
                }
            });
        });
    }

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, devDir, devAppDir, true).then(onRequestValidated, onValidationError);

};

module.exports = AtomServices;