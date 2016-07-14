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

/**----------------------Private methods ------------------------  **/
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

var isRequestValid = function (developerHostname, appHostname, devDir, atomDir, validateAppCerts) {

    return new Promise(function (resolve, reject) {
        function onValidationError(error) {
            reject(error);
        }

        function onMetadataReceived(metadata) {
            resolve(metadata);
        }

        function getMetadata() {
            beameUtils.getNodeMetadata(atomDir || devDir, developerHostname, global.AppModules.Atom).then(onMetadataReceived, onValidationError);
        }

        function validateAtomCerts() {
            if (validateAppCerts) {
                beameUtils.isNodeCertsExists(atomDir, global.ResponseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(getMetadata, onValidationError);
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
 * @param {String} developerHostname
 * @param {String} appName
 * @param {Function} callback
 */
var registerAtom = function (developerHostname, appName, callback) {

    var devDir = beameUtils.makePath(devPath, developerHostname + "/");

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            name: appName
        };

        var apiData = beameUtils.getApiData(apiActions.CreateAtom.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, function (error, payload) {
            if (!error) {
                payload.name = appName;
                payload.parent_fqdn = developerHostname;

                var atomDir = devDir + payload.hostname + '/';

                dataServices.createDir(atomDir);

                dataServices.savePayload(atomDir, payload, global.ResponseKeys.AtomCreateResponseKeys, global.AppModules.Atom, function (error) {
                    if (!callback) return;

                    if (!error) {
                        beameUtils.getNodeMetadata(atomDir, payload.hostname, global.AppModules.Atom).then(function (metadata) {
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
var getCert = function (developerHostname, appHostname, callback) {
    var devDir = beameUtils.makePath(devPath, developerHostname + "/");
    var atomDir = beameUtils.makePath(devDir, appHostname + "/");

    /*---------- private callbacks -------------------*/
    function onRequestValidated(metadata) {

        dataServices.createCSR(atomDir, appHostname).then(
            function onCsrCreated(csr) {

                provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

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

                            dataServices.saveCerts(atomDir, payload, callback);
                        }
                        else {
                            //noinspection JSUnresolvedVariable
                            error.data.hostname = appHostname;
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

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, devDir, atomDir, false).then(onRequestValidated, onValidationError);

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
    var debugMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.DebugInfo, "Call Create Atom", {
        "developer": developerHostname,
        "name": appName
    });
    debug(debugMsg);

    registerAtom(developerHostname, appName, function (error, payload) {
        if (!error) {

            var hostname = payload.hostname;

            getCert(developerHostname, hostname, function (error) {
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

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {String} appName
 * @param {Function} callback
 */
AtomServices.prototype.updateAtom = function (developerHostname, appHostname, appName, callback) {
    var devDir = beameUtils.makePath(devPath, developerHostname + "/");
    var atomDir = beameUtils.makePath(devDir, appHostname + "/");

    /*---------- private callbacks -------------------*/
    function onRequestValidated(metadata) {

        provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            hostname: appHostname,
            name: appName
        };

        var apiData = beameUtils.getApiData(apiActions.UpdateAtom.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, function (error) {
            if (!error) {
                metadata.name = appName;
                dataServices.saveFile(atomDir, global.metadataFileName, beameUtils.stringify(metadata));
                callback && callback(null, metadata);
            }
            else {
                error.data.hostname = appHostname;
                console.error(error);
                callback && callback(error, null);
            }
        });
    }

    function onValidationError(error) {
        callback && callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, devDir, atomDir, true).then(onRequestValidated, onValidationError);

};


//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {Function} callback
 */
AtomServices.prototype.deleteAtom = function (developerHostname, appHostname, callback) {
    var devDir = beameUtils.makePath(devPath, developerHostname + "/");
    var atomDir = beameUtils.makePath(devDir, appHostname + "/");

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            hostname: appHostname
        };

        var apiData = beameUtils.getApiData(apiActions.DeleteAtom.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, function (error) {
            if (!error) {
                //delete atom folder
                dataServices.deleteFolder(atomDir,function (error) {
                    if(!error){
                        callback(null,'done');
                        return;
                    }

                    callback && callback(error, null);
                });
            }
            else {
                error.data.hostname = appHostname;
                console.error(error);
                callback && callback(error, null);
            }
        });
    }

    function onValidationError(error) {
        callback && callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, devDir, atomDir, true).then(onRequestValidated, onValidationError);

};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {Function} callback
 */
AtomServices.prototype.renewCert = function (developerHostname, appHostname, callback) {
    var devDir = beameUtils.makePath(devPath, developerHostname + "/");
    var atomDir = beameUtils.makePath(devDir, appHostname + "/");

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        dataServices.createCSR(atomDir, appHostname, global.CertFileNames.TEMP_PRIVATE_KEY).then(
            function onCsrCreated(csr) {

                var postData = {
                    hostname: appHostname,
                    csr: csr
                };

                var apiData = beameUtils.getApiData(apiActions.RenewCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {

                        dataServices.renameFile(atomDir, global.CertFileNames.TEMP_PRIVATE_KEY, global.CertFileNames.PRIVATE_KEY, function (error) {
                            if (!error) {
                                dataServices.saveCerts(atomDir, payload, callback);
                            }
                            else {
                                callback && callback(error, null);
                            }
                        });

                    }
                    else {

                        dataServices.deleteFile(atomDir, global.CertFileNames.TEMP_PRIVATE_KEY);

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

    function onValidationError(error) {
        callback && callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, devDir, atomDir, true).then(onRequestValidated, onValidationError);
};

//noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {Function} callback
 */
AtomServices.prototype.revokeCert = function (developerHostname, appHostname, callback) {
    var devDir = beameUtils.makePath(devPath, developerHostname + "/");
    var atomDir = beameUtils.makePath(devDir, appHostname + "/");

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(devDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            hostname: appHostname
        };

        var apiData = beameUtils.getApiData(apiActions.RevokeCert.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, function (error) {
            if (!error) {

                //TODO delete old certs

                callback && callback(null, 'done');
            }
            else {
                console.error(error);
                callback && callback(error, null);
            }
        });

    }

    function onValidationError(error) {
        callback && callback(error, null);
    }


    isRequestValid(developerHostname, appHostname, devDir, atomDir, true).then(onRequestValidated, onValidationError);

};

module.exports = AtomServices;