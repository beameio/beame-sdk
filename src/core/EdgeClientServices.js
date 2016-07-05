/**
 * Created by zenit1 on 04/07/2016.
 */
var debug = require("debug")("./src/services/EdgeClientServices.js");
var _ = require('underscore');
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData

var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.EdgeClient;


var validateDeveloperHost = function (developerHostname) {
    var errMsg;
    return new Promise(function (resolve, reject) {
        if (_.isEmpty(developerHostname)) {
            errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.HostnameRequired, "Get atom certs, developer hostname missing", {"error": "developer hostname missing"});
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
            errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.HostnameRequired, "Get atom certs, atom hostname missing", {"error": "atom hostname missing"});
            reject(errMsg);
            return;
        }
        resolve(true);
    });
};

var isEdgeHostValid = function (hostname) {

    var errMsg;
    return new Promise(function (resolve, reject) {

        if (_.isEmpty(hostname)) {
            errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.HostnameRequired, "Get edge client certs, edge hostname missing", {"error": "edge hostname missing"});
            reject(errMsg);
            return;
        }
        resolve(true);
    });
};

/**
 *
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {String|null} [edgeHostname]
 * @param {String} devDir
 * @param {String} devAppDir
 * @param {String|null} [edgeClientDir]
 * @param {boolean} validateEdgeHostname
 * @returns {Promise}
 */
var isRequestValid = function (developerHostname, appHostname, edgeHostname, devDir, devAppDir, edgeClientDir ,validateEdgeHostname) {

    return new Promise(function (resolve, reject) {

        function onValidationError(error) {
            reject(error);
        }

        function onMetadataReceived(metadata) {
            resolve(metadata);
        }

        function getMetadata() {
            beameUtils.getNodeMetadata(edgeClientDir || devAppDir, developerHostname, global.AppModules.Atom).then(onMetadataReceived, onValidationError);
        }

        function validateAtomCerts() {
            beameUtils.isNodeCertsExists(devAppDir, global.ResponseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(getMetadata, onValidationError);
        }

        function validateDevCerts() {
            beameUtils.isNodeCertsExists(devDir, global.ResponseKeys.NodeFiles, global.AppModules.Atom, developerHostname, global.AppModules.Developer).then(validateAtomCerts, onValidationError);
        }

        function validateEdgeClientHost() {
            if (validateEdgeHostname) {
                isEdgeHostValid(edgeHostname).then(validateDevCerts, onValidationError);
            }
            else {
                validateDevCerts();
            }
        }

        function validateAtomHost() {
            isAtomHostValid(appHostname).then(validateEdgeClientHost, onValidationError);
        }


        validateDeveloperHost(developerHostname).then(validateAtomHost, onValidationError);
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
EdgeClientServices.prototype.registerEdgeClient = function (developerHostname, appHostname, callback) {
    var errMsg;
    var devDir = devPath + developerHostname + "/";
    var devAppDir = devDir + appHostname + "/";


    /*---------- private callbacks -------------------*/
    function onEdgeSelectionError(error) {
        errMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.EdgeLbError, "select best proxy error", {
            "error": error,
            "lb": global.loadBalancerEdnpoint
        });
        console.error(errMsg);
        callback && callback(error, null);
    }

    /** @param {EdgeShortData} edge  **/
    function onEdgeServerSelected(edge) {

        var postData = {
            host: edge.endpoint
        };

        var apiData = beameUtils.getApiData(apiActions.CreateEdgeClient.endpoint, postData, true);

        provisionApi.runRestfulAPI(apiData, function (error, payload) {
            if (!error) {
                var edgeClientDir = devAppDir + payload.hostname + '/';

                dataServices.createDir(edgeClientDir);

                dataServices.savePayload(edgeClientDir + global.metadataFileName, payload, global.ResponseKeys.EdgeClientResponseKeys, global.AppModules.EdgeClient, function (error) {
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

    }

    function onRequestValidated() {
        var authData = beameUtils.getAuthToken(devAppDir + global.CertFileNames.PRIVATE_KEY, devAppDir + global.CertFileNames.X509, false, false, devAppDir, appHostname);

        provisionApi.setAuthData(authData, function () {
            beameUtils.selectBestProxy(global.loadBalancerEdnpoint).then(onEdgeServerSelected,onEdgeSelectionError);
        });
    }

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, null, devDir, devAppDir, null, false).then(onRequestValidated, onValidationError);
};

/**
 *
 * @param {String} developerHostname
 * @param {String} appHostname
 * @param {String} edgeHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.getCert = function (developerHostname, appHostname, edgeHostname, callback) {
    var errMsg;
    var devDir = devPath + developerHostname + "/";
    var devAppDir = devDir + appHostname + "/";
    var edgeClientDir = devAppDir + edgeHostname + "/";

    function onRequestValidated(metadata) {
        var authData = beameUtils.getAuthToken(devAppDir + global.CertFileNames.PRIVATE_KEY, devAppDir + global.CertFileNames.X509, true, true, edgeClientDir, edgeHostname);

        provisionApi.setAuthData(authData, function (csr) {
            if (!_.isEmpty(csr)) {

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
    }

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(developerHostname, appHostname, edgeHostname, devDir, devAppDir, edgeClientDir, false).then(onRequestValidated, onValidationError);

};

module.exports = EdgeClientServices;