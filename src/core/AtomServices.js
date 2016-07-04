/**
 * Created by zenit1 on 04/07/2016.
 */
var debug = require("debug")("./src/services/DeveloperServices.js");
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData

var responseKeys = require('../../config/ResponseKeys.json');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.AtomApi;

/**
 *
 * @constructor
 */
var AtomServices = function () {

    dataServices.createDir(devPath);
};

/**
 *
 * @param {String} developerHostname
 * @param {String} appName
 * @param {Function} callback
 */
AtomServices.prototype.createAtom = function (developerHostname, appName, callback) {
    var self = this;

    var debugMsg = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.DebugInfo, "Call Create Atom", {
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

    /*---------- check if developer exists -------------------*/

    var devDir = devPath + developerHostname + "/";

    if (!dataServices.isNodeFilesExists(devDir, responseKeys.NodeFiles)) {
        var msg = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.NodeFilesMissing, "developer files not found", {"hostname": hostname});
        console.error(msg);
        callback && callback(msg, null);
        return;
    }


    /*---------- read developer data and proceed -------------*/
    beameUtils.getNodeMetadata(devDir, developerHostname, global.AppModules.Atom).then(function onSuccess(metadata) {
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

    }, function onError(error) {
        callback(error, null);
    });

};


/**
 *
 * @param {String} developerHostname
 * @param {String}  appHostname
 * @param {Function} callback
 */
AtomServices.prototype.getCert = function (developerHostname, appHostname, callback) {
    var errorJson;

    if (!developerHostname) {
        errorJson = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.HostnameRequired, "Get atom certs, developer hostname missing", {"error": "developer hostname missing"});
        debug(errorJson);

        callback && callback(errorJson, null);
        return;
    }

    if (!appHostname) {
        errorJson = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.HostnameRequired, "Get atom certs, atom hostname missing", {"error": "atom hostname missing"});
        debug(errorJson);

        callback && callback(errorJson, null);
        return;
    }

    var devDir = devPath + developerHostname + "/";
    var devAppDir = devDir + appHostname + "/";

    /*---------- check if developer exists -------------------*/
    if (!dataServices.isPathExists(devDir)) {//provided invalid hostname
        errorJson = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.NodeFolderNotExists, "Developer hostname is invalid, list ./.beame to see existing hostnames", {"hostname": developerHostname});
        console.error(errorJson);
        callback(errorJson, null);
        return;
    }

    /*---------- check if atom exists -------------------*/
    beameUtils.getNodeMetadata(devAppDir, appHostname, global.AppModules.Atom).then(function onSuccess(metadata) {
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

                        dataServices.saveCerts(devAppDir, payload, responseKeys.CertificateResponseKeys, callback);
                    }
                    else {
                        errorJson = {"message": "CSR for " + appHostname + " failed"};
                        console.error(errorJson);
                        callback(errorJson, null);
                    }
                });
            }
            else {
                errorJson = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.CSRCreationFailed, "CSR not created", {"hostname": hostname});
                console.error(errorJson);
                callback && callback(errorJson, null);
            }
        });
    }, function onError(error) {
        callback(error, null);
    });


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

    if (!developerHostname) {
        errMsg = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.HostnameRequired, "Get atom certs, developer hostname missing", {"error": "developer hostname missing"});
        debug(errMsg);

        callback && callback(errMsg, null);
        return;
    }

    if (!appHostname) {
        errMsg = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.HostnameRequired, "Get atom certs, atom hostname missing", {"error": "atom hostname missing"});
        debug(errMsg);

        callback && callback(errMsg, null);
        return;
    }

    var devDir = devPath + developerHostname + "/";
    var devAppDir = devDir + appHostname + "/";

    /*---------- check if atom exists -------------------*/
    beameUtils.getNodeMetadata(devAppDir, appHostname, global.AppModules.Atom).then(function onSuccess(metadata) {
        /*----------- generate RSA key + csr and post to provision ---------*/
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
                    errMsg = beameUtils.formatDebugMessage(global.AppModules.Atom, global.MessageCodes.ApiRestError, "atom update  API error", {"error": error});
                    console.error(errMsg);
                    callback && callback(errMsg, null);
                }
            });
        });
    }, function onError(error) {
        callback(error, null);
    });
};

module.exports = AtomServices;