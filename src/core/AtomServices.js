/**
 * Created by zenit1 on 04/07/2016.
 */
var debug = require("debug")("AtomServices");
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData

var responseKeys = require('../../config/ResponseKeys.json');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.AtomApi;


var isDeveloperHostsValid = function (developerHostname) {
    var errMsg;
    return new Promise(function (resolve, reject) {
        if (!developerHostname) {
            errMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.HostnameRequired, "Get atom certs, developer hostname missing", {"error": "developer hostname missing"});
            reject(errMsg);
            return;
        }

        resolve(true);
    });
};

var isAtomHostsValid = function (appHostname) {
    var errMsg;
    return new Promise(function (resolve, reject) {

        if (!appHostname) {
            errMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.HostnameRequired, "Get atom certs, atom hostname missing", {"error": "atom hostname missing"});
            reject(errMsg);
            return;
        }
        resolve(true);
    });
};

var isRequestValid = function (developerHostname, appHostname, devDir, devAppDir,validateAppCerts) {

    return new Promise(function (resolve, reject) {

        function onMetaInfoReceived(metadata) {
            resolve(metadata);
        }

        function getMetainfo() {
            beameUtils.getNodeMetadata(devAppDir || devDir, developerHostname, global.AppModules.Atom).then(onMetaInfoReceived, onValidationError);
        }

        function onCertsValidated() {
            if (validateAppCerts && devAppDir) {
                beameUtils.isNodeCertsExists(devAppDir, responseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(getMetainfo, onValidationError);
            }
            else {
                getMetainfo();
            }
        }

        function onAtomHostValidated() {
            beameUtils.isNodeCertsExists(devDir, responseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(onCertsValidated, onValidationError);
        }

        function onDeveloperHostValidated() {
            isAtomHostsValid(appHostname).then(onAtomHostValidated, onValidationError);
        }

        function onValidationError(error) {
            reject(error);
        }

        isDeveloperHostsValid(developerHostname).then(onDeveloperHostValidated, onValidationError);
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

                    dataServices.savePayload(devAppDir + global.metadataFileName, payload, responseKeys.AtomCreateResponseKeys, function (error) {
                        if (!callback) return;

                        if (!error) {
                            callback(null, payload);
                        }
                        else {
                            callback(error, null);
                        }
                    });
                }
                else {
                    console.error(error);
                    callback(error, null);
                }
            });
        });

    }

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(developerHostname, "EMPTY DUMMY", devDir, null,false).then(onRequestValidated, onValidationError);
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
            if (csr != null) {

                var postData = {
                    csr: csr,
                    uid: metadata.uid
                };

                var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {

                        dataServices.saveCerts(devAppDir, payload, callback);
                    }
                    else {
                        errMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.ApiRestError, "atom get cert api error", {"hostname": appHostname});
                        console.error(errMsg);
                        callback(errMsg, null);
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

    isRequestValid(developerHostname, appHostname, devDir, devAppDir,false).then(onRequestValidated, onValidationError);

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
                    errMsg = global.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.ApiRestError, "atom update  API error", {"error": error});
                    console.error(errMsg);
                    callback && callback(errMsg, null);
                }
            });
        });
    }

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, devDir, devAppDir,true).then(onRequestValidated, onValidationError);
 
};

module.exports = AtomServices;
