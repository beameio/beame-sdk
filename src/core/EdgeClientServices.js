/**
 * Created by zenit1 on 04/07/2016.
 */
var debug = require("debug")("./src/services/EdgeClientServices.js");
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData

var responseKeys = require('../../config/ResponseKeys.json');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.EdgeClient;


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

var isRequestValid = function (developerHostname, appHostname, edgeHostname, devDir, devAppDir,validateAppCerts) {

    return new Promise(function (resolve, reject) {

        function onMetaInfoReceived(metadata) {
            resolve(metadata);
        }
        

        function onAtomCertsValidated() {
            beameUtils.getNodeMetadata(devAppDir, developerHostname, global.AppModules.Atom).then(onMetaInfoReceived, onValidationError);
        }
        
        function onDeveloperCertsValidated() {
            beameUtils.isNodeCertsExists(devAppDir, responseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(onAtomCertsValidated, onValidationError);
        }

        function onAtomHostValidated() {
            beameUtils.isNodeCertsExists(devDir, responseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(onDeveloperCertsValidated, onValidationError);
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

var EdgeClientServices = function () {
};

/**
 *
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.createEdgeClient = function (developerHostname, appHostname, callback) {
    var self = this;

    var debugMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.DebugInfo, "Call Create Atom", {
        "developer": developerHostname,
        "atom": appHostname
    });
    debug(debugMsg);

    self.registerEdgeClient(developerHostname, appHostname, function (error, payload) {
        if (!error) {

            var hostname = payload.hostname;

            self.getCert(developerHostname, appHostname, hostname, function (error) {
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
 * @param {String} appHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.registerEdgeClient = function(developerHostname, appHostname, callback){
    var errMsg;

    if (!developerHostname) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.HostnameRequired, "Get atom certs, developer hostname missing", {"error": "developer hostname missing"});
        debug(errMsg);

        callback && callback(errMsg, null);
        return;
    }

    if (!appHostname) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.HostnameRequired, "Get atom certs, atom hostname missing", {"error": "atom hostname missing"});
        debug(errMsg);

        callback && callback(errMsg, null);
        return;
    }

    var devDir = devPath + developerHostname + "/";
    var devAppDir = devDir + appHostname + "/";

    /*---------- check if developer exists -------------------*/
    if (!dataServices.isNodeFilesExists(devDir, responseKeys.NodeFiles)) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.NodeFilesMissing, "developer files not found", {"hostname": developerHostname});
        console.error(errMsg);
        callback && callback(errMsg, null);
        return;
    }

    /*---------- check if atom files exists -------------------*/
    if (!dataServices.isNodeFilesExists(devAppDir, responseKeys.NodeFiles)) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.NodeFilesMissing, "atom files not found", {"hostname": appHostname});
        console.error(errMsg);
        callback && callback(errMsg, null);
        return;
    }

    /*---------- check if atom exists -------------------*/
    beameUtils.getNodeMetadata(devAppDir, appHostname, global.AppModules.EdgeClient).then(function onSuccess() {
        /*----------- generate RSA key + csr and post to provision ---------*/
        var authData = beameUtils.getAuthToken(devAppDir + global.CertFileNames.PRIVATE_KEY, devAppDir + global.CertFileNames.X509, false, false, devAppDir, appHostname);

        provisionApi.setAuthData(authData, function () {


            beameUtils.selectBestProxy(global.loadBalancerEdnpoint).then(
                /** @param {EdgeShortData} edge  **/
                function onSuccess(edge){

                    var postData = {
                        host: edge.endpoint
                    };

                    var apiData = beameUtils.getApiData(apiActions.CreateEdgeClient.endpoint, postData, true);

                    provisionApi.runRestfulAPI(apiData, function (error, payload) {
                        if (!error) {
                            var edgeClientDir = devAppDir + payload.hostname + '/';

                            dataServices.createDir(edgeClientDir);

                            dataServices.savePayload(edgeClientDir + global.metadataFileName, payload, responseKeys.EdgeClientResponseKeys, function (error) {
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
                            errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.ApiRestError, "create edge client  API error", {"error": error});
                            console.error(errMsg);
                            callback && callback(errMsg, null);
                        }
                    });

            },
            function onError(error){
                errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.EdgeLbError, "select best proxy error", {"error": error,"lb":global.loadBalancerEdnpoint});
                console.error(errMsg);
                callback && callback(error,null);
            });


        });
    }, function onError(error) {
        callback(error, null);
    });
};

/**
 *
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {String} edgeHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.getCert = function(developerHostname, appHostname, edgeHostname, callback){
    var errMsg;

    if (!developerHostname) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.HostnameRequired, "Get edge client certs, developer hostname missing", {"error": "developer hostname missing"});
        debug(errMsg);

        callback && callback(errMsg, null);
        return;
    }

    if (!appHostname) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.HostnameRequired, "Get edge client certs, atom hostname missing", {"error": "atom hostname missing"});
        debug(errMsg);

        callback && callback(errMsg, null);
        return;
    }

    if (!edgeHostname) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.HostnameRequired, "Get edge client certs, edge hostname missing", {"error": "edge hostname missing"});
        debug(errMsg);

        callback && callback(errMsg, null);
        return;
    }

    var devDir = devPath + developerHostname + "/";
    var devAppDir = devDir + appHostname + "/";
    var edgeClientDir = devAppDir + edgeHostname + "/";

    /*---------- check if developer exists -------------------*/
    if (!dataServices.isNodeFilesExists(devDir, responseKeys.NodeFiles)) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.NodeFilesMissing, "developer files not found", {"hostname": developerHostname});
        console.error(errMsg);
        callback && callback(errMsg, null);
        return;
    }

    /*---------- check if atom files exists -------------------*/
    if (!dataServices.isNodeFilesExists(devAppDir, responseKeys.NodeFiles)) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.NodeFilesMissing, "atom files not found", {"hostname": appHostname});
        console.error(errMsg);
        callback && callback(errMsg, null);
        return;
    }

    /*---------- check if atom exists -------------------*/
    beameUtils.getNodeMetadata(edgeClientDir, edgeHostname, global.AppModules.EdgeClient).then(function onSuccess(metadata) {
        /*----------- generate RSA key + csr and post to provision ---------*/
        var authData = beameUtils.getAuthToken(devAppDir + global.CertFileNames.PRIVATE_KEY, devAppDir + global.CertFileNames.X509, true, true, edgeClientDir, edgeHostname);

        provisionApi.setAuthData(authData, function (csr) {
            if (csr != null) {

                var postData = {
                    csr: csr,
                    uid: metadata.uid
                };

                var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {

                        dataServices.saveCerts(edgeClientDir, payload, callback);
                    }
                    else {
                        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.ApiRestError, "atom get cert api error", {"hostname": edgeHostname});
                        console.error(errMsg);
                        callback(errMsg, null);
                    }
                });
            }
            else {
                errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.CSRCreationFailed, "CSR not created", {"hostname": edgeHostname});
                console.error(errMsg);
                callback && callback(errMsg, null);
            }
        });
    }, function onError(error) {
        callback(error, null);
    });

};

module.exports = EdgeClientServices;