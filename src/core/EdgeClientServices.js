/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';
require('../utils/Globals');
var debug = require("debug")("./src/services/EdgeClientServices.js");
var _ = require('underscore');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.EdgeClient;


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
 * @param {String} appHostname
 * @param {Function} callback
 * @this {EdgeClientServices}
 */
var registerEdgeClient = function (appHostname, callback) {
    var self = this;
    var errMsg;

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

        provisionApi.setAuthData(beameUtils.getAuthToken(self.devAppDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            host: edge.endpoint
        };

        var apiData = beameUtils.getApiData(apiActions.CreateEdgeClient.endpoint, postData, true);

        provisionApi.runRestfulAPI(apiData, function (error, payload) {
            if (!error) {
                payload.atom_fqdn = appHostname;

                var edgeClientDir = beameUtils.makePath(self.devAppDir, payload.hostname + '/');

                dataServices.createDir(edgeClientDir);

                dataServices.savePayload(edgeClientDir, payload, global.ResponseKeys.EdgeClientResponseKeys, global.AppModules.EdgeClient, function (error) {
                    if (!callback) return;

                    if (!error) {

                        beameUtils.getNodeMetadata(edgeClientDir, payload.hostname, global.AppModules.EdgeClient).then(function (metadata) {
                            self.edgeClientDir = edgeClientDir;
                            callback(null, metadata);
                        }, callback);
                    }
                    else {
                        callback(error, null);
                    }
                });

            }
            else {
                error.data.hostname = appHostname;
                // console.error(error);
                callback && callback(error, null);
            }
        });

    }

    function onRequestValidated() {

        //TODO create permanent solution
        beameUtils.selectBestProxy(global.loadBalancerEdnpoint,100, 1000).then(onEdgeServerSelected, onEdgeSelectionError);

    }

    function onValidationError(error) {
        callback(error, null);
    }

    isRequestValid(appHostname, null, self.devAppDir, null, false).then(onRequestValidated, onValidationError);
};

/**
 *
 * @param {String} appHostname
 * @param {String} edgeHostname
 * @param {Function} callback
 * @this {EdgeClientServices}
 */
var getCert = function (appHostname, edgeHostname, callback) {
    var self = this;
    var errMsg;


    function onRequestValidated(metadata) {

        dataServices.createCSR(self.edgeClientDir, edgeHostname).then(
            function onCsrCreated(csr) {

                provisionApi.setAuthData(beameUtils.getAuthToken(self.devAppDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

                var postData = {
                    csr: csr,
                    uid: metadata.uid
                };

                var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {
                        dataServices.saveCerts(self.edgeClientDir, payload, callback);
                    }
                    else {
                        error.data.hostname = edgeHostname;
                        console.error(error);
                        callback(errMsg, null);
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

    isRequestValid(appHostname, edgeHostname, self.devAppDir, self.edgeClientDir, false).then(onRequestValidated, onValidationError);

};

/**
 *
 * @param {String} appHostname
 * @param {String|null} [edgeHostname]
 * @param {String} devAppDir
 * @param {String|null} [edgeClientDir]
 * @param {boolean} validateEdgeHostname
 * @returns {Promise}
 */
var isRequestValid = function (appHostname, edgeHostname, devAppDir, edgeClientDir, validateEdgeHostname) {

    return new Promise(function (resolve, reject) {

        function onValidationError(error) {
            reject(error);
        }

        function onMetadataReceived(metadata) {
            resolve(metadata);
        }

        function getMetadata() {
            beameUtils.getNodeMetadata(edgeClientDir || devAppDir, appHostname, global.AppModules.Atom).then(onMetadataReceived, onValidationError);
        }

        function validateAtomCerts() {
            beameUtils.isNodeCertsExists(devAppDir, global.ResponseKeys.NodeFiles, global.AppModules.Atom, appHostname, global.AppModules.Developer).then(getMetadata, onValidationError);
        }

        function validateEdgeClientHost() {
            if (validateEdgeHostname) {
                isEdgeHostValid(edgeHostname).then(validateAtomCerts, onValidationError);
            }
            else {
                validateAtomCerts();
            }
        }

        isAtomHostValid(appHostname).then(validateEdgeClientHost, onValidationError);
    });
};

var EdgeClientServices = function () {
};

/**
 *
 * @param {String} appHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.createEdgeClient = function (appHostname, callback) {

    var self = this;

    var debugMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.DebugInfo, "Call Create Edge Client", {
        "atom": appHostname
    });
    debug(debugMsg);


    beameUtils.findHostPath(appHostname).then( function onAtomPathReceived(path) {
        /** @member {String} **/
        self.devAppDir = path;

        registerEdgeClient.call(self, appHostname, function (error, payload) {
            if (!error) {

                if (payload && payload.hostname) {
                    var hostname = payload.hostname;

                    getCert.call(self, appHostname, hostname, function (error) {
                        if (callback) {
                            error ? callback(error, null) : callback(null, payload);
                        }
                    });
                }
                else {
                    console.error("unexpected error", payload);
                }

            }
            else {
                callback && callback(error, null);
            }
        });
    }, function onSearchFailed(){
        callback('Atom folder not found', null);
    });

};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} edgeHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.deleteEdgeClient = function (edgeHostname,callback) {

    var edgeClientDir,devAppDir;

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(devAppDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            hostname: edgeHostname
        };

        var apiData = beameUtils.getApiData(apiActions.DeleteEdgeClient.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, function (error) {
            if (!error) {

                dataServices.deleteFolder(edgeClientDir,function(error){
                    if(!error){
                        callback && callback(null, 'done');
                        return;
                    }
                    callback && callback(error, null);
                });
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

    function onAtomPathReceived(path) {

        edgeClientDir = path;

        devAppDir = path.substring(0, path.lastIndexOf('/'));

        isRequestValid(devAppDir.substring(devAppDir.lastIndexOf('/')+1), edgeHostname, devAppDir, edgeClientDir, false).then(onRequestValidated, onValidationError);

    }

    beameUtils.findHostPath(edgeHostname).then(onAtomPathReceived, function onSearchFailed(){
        callback('Atom folder not found', null);
    });
};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} edgeHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.renewCert = function (edgeHostname,callback) {

    var edgeClientDir,devAppDir;

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(devAppDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        dataServices.createCSR(edgeClientDir, edgeHostname, global.CertFileNames.TEMP_PRIVATE_KEY).then(
            function onCsrCreated(csr) {

                var postData = {
                    hostname: edgeHostname,
                    csr: csr
                };

                var apiData = beameUtils.getApiData(apiActions.RenewCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {

                        dataServices.renameFile(edgeClientDir, global.CertFileNames.TEMP_PRIVATE_KEY, global.CertFileNames.PRIVATE_KEY, function (error) {
                            if (!error) {
                                dataServices.saveCerts(edgeClientDir, payload, callback);
                            }
                            else {
                                callback && callback(error, null);
                            }
                        });

                    }
                    else {

                        dataServices.deleteFile(edgeClientDir, global.CertFileNames.TEMP_PRIVATE_KEY);

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

    function onAtomPathReceived(path) {

        edgeClientDir = path;

        devAppDir = path.substring(0, path.lastIndexOf('/') );

        isRequestValid(devAppDir.substring(devAppDir.lastIndexOf('/')+1), edgeHostname, devAppDir, edgeClientDir, false).then(onRequestValidated, onValidationError);

    }


    beameUtils.findHostPath(edgeHostname).then(onAtomPathReceived, function onSearchFailed(){
        callback('Atom folder not found', null);
    });



};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} edgeHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.revokeCert = function (edgeHostname,callback) {

    var edgeClientDir,devAppDir;

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(devAppDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            hostname: edgeHostname
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

    function onAtomPathReceived(path) {

        edgeClientDir = path;

        devAppDir = path.substring(0, path.lastIndexOf('/'));

        isRequestValid(devAppDir.substring(devAppDir.lastIndexOf('/')+1), edgeHostname, devAppDir, edgeClientDir, false).then(onRequestValidated, onValidationError);

    }

    beameUtils.findHostPath(edgeHostname).then(onAtomPathReceived, function onSearchFailed(){
        callback('Atom folder not found', null);
    });
};

module.exports = EdgeClientServices;
