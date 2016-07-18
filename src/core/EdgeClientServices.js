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

var PATH_MISMATCH_DEFAULT_MSG = 'Edge folder not found';

/**
 * @param {String} hostname
 * @param {String} atomDir
 * @param {String|null} [edgeClientDir]
 * @param {boolean} validateEdgeHostname
 * @returns {Promise}
 */
var isRequestValid = function (hostname, atomDir, edgeClientDir, validateEdgeHostname) {

    return new Promise(function (resolve, reject) {

        function onValidationError(error) {
            reject(error);
        }

        function onMetadataReceived(metadata) {
            resolve(metadata);
        }

        function getMetadata() {
            beameUtils.getNodeMetadataAsync(edgeClientDir || atomDir, hostname, global.AppModules.Atom).then(onMetadataReceived).catch(onValidationError);
        }

        function validateAtomCerts() {
            beameUtils.isNodeCertsExistsAsync(atomDir, global.ResponseKeys.NodeFiles, global.AppModules.Atom, hostname, global.AppModules.Developer).then(getMetadata).catch(onValidationError);
        }

        function validateEdgeClientHost() {
            if (validateEdgeHostname && _.isEmpty(hostname)) {
                reject('Hostname required');
            }
            else {
                validateAtomCerts();
            }
        }

        if (_.isEmpty(hostname)) {
            reject('Hostname required');
        }
        else {
            validateEdgeClientHost();
        }

    });
};


/**
 *
 * @param {String} atomHostname
 * @param {Function} callback
 * @this {EdgeClientServices}
 */
var registerEdgeClient = function (atomHostname, callback) {
    var atomDir;
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

        provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            host: edge.endpoint
        };

        var apiData = beameUtils.getApiData(apiActions.CreateEdgeClient.endpoint, postData, true);

        provisionApi.runRestfulAPI(apiData, function (error, payload) {
            if (!error) {
                payload.parent_fqdn = atomHostname;

                var edgeClientDir = beameUtils.makePath(atomDir, payload.hostname + '/');

                dataServices.createDir(edgeClientDir);

                dataServices.savePayload(edgeClientDir, payload, global.ResponseKeys.EdgeClientResponseKeys, global.AppModules.EdgeClient, function (error) {
                    if (!callback) return;

                    if (!error) {

                        beameUtils.getNodeMetadataAsync(edgeClientDir, payload.hostname, global.AppModules.EdgeClient).then(function (metadata) {
                            callback(null, metadata);
                        }, callback);
                    }
                    else {
                        callback(error, null);
                    }
                });

            }
            else {
                error.data.hostname = atomHostname;
                // console.error(error);
                callback && callback(error, null);
            }
        });

    }

    function onRequestValidated() {

        //TODO create permanent solution
        beameUtils.selectBestProxy(global.loadBalancerEdnpoint, 100, 1000).then(onEdgeServerSelected, onEdgeSelectionError);

    }

    /**
     *
     * @param {ItemAndParentFolderPath} data
     */
    function onAtomPathReceived(data) {

        atomDir = data['path'];

        isRequestValid(atomHostname, atomDir, null, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
    }

    beameUtils.findHostPathAndParentAsync(atomHostname).then(onAtomPathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, 'Atom folder not found'));
};

/**
 *
 * @param {String} atomHostname
 * @param {String} edgeHostname
 * @param {Function} callback
 * @this {EdgeClientServices}
 */
var getCert = function (atomHostname, edgeHostname, callback) {
    var errMsg;
    var edgeClientDir, atomDir;


    function onRequestValidated(metadata) {

        dataServices.createCSR(edgeClientDir, edgeHostname).then(
            function onCsrCreated(csr) {

                provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

                var postData = {
                    csr: csr,
                    uid: metadata.uid
                };

                var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

                provisionApi.runRestfulAPI(apiData, function (error, payload) {
                    if (!error) {
                        dataServices.saveCerts(beameUtils.makePath(edgeClientDir, '/'), payload, callback);
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

    /**
     *
     * @param {ItemAndParentFolderPath} data
     */
    function onEdgePathReceived(data) {

        edgeClientDir = data['path'];
        atomDir = data['parent_path'];

        isRequestValid(atomHostname, atomDir, edgeClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));
    }


    beameUtils.findHostPathAndParentAsync(edgeHostname).then(onEdgePathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));

};


var EdgeClientServices = function () {
};

/**
 *
 * @param {String} atomHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.createEdgeClient = function (atomHostname, callback) {

    var debugMsg = global.formatDebugMessage(global.AppModules.EdgeClient, global.MessageCodes.DebugInfo, "Call Create Edge Client", {
        "atom": atomHostname
    });
    debug(debugMsg);

    if (_.isEmpty(atomHostname)) {
        callback('Developer host required', null);
        return;
    }

    function onEdgeRegistered(error, payload) {
        if (!error) {

            if (payload && payload.hostname) {
                var hostname = payload.hostname;

                getCert(atomHostname, hostname, function (error) {
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
    }

    registerEdgeClient(atomHostname, onEdgeRegistered);

};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} edgeHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.deleteEdgeClient = function (edgeHostname, callback) {

    var edgeClientDir, atomDir;

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            hostname: edgeHostname
        };

        var apiData = beameUtils.getApiData(apiActions.DeleteEdgeClient.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, function (error) {
            if (!error) {

                dataServices.deleteFolder(edgeClientDir, function (error) {
                    if (!error) {
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

    function onEdgePathReceived(data) {

        edgeClientDir = data['path'];

        atomDir = data['parent_path'];

        isRequestValid(edgeHostname, atomDir, edgeClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));

    }

    beameUtils.findHostPathAndParentAsync(edgeHostname).then(onEdgePathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} edgeHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.renewCert = function (edgeHostname, callback) {

    var edgeClientDir, atomDir;

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

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
                                dataServices.saveCerts(beameUtils.makePath(edgeClientDir, '/'), payload, callback);
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

    function onEdgePathReceived(data) {

        edgeClientDir = data['path'];

        atomDir = data['parent_path'];

        isRequestValid(edgeHostname, atomDir, edgeClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));

    }

    beameUtils.findHostPathAndParentAsync(edgeHostname).then(onEdgePathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));


};

//noinspection JSUnusedGlobalSymbols
/**
 * @param {String} edgeHostname
 * @param {Function} callback
 */
EdgeClientServices.prototype.revokeCert = function (edgeHostname, callback) {

    var edgeClientDir, atomDir;

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

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

    function onEdgePathReceived(data) {

        edgeClientDir = data['path'];

        atomDir = data['parent_path'];

        isRequestValid(edgeHostname, atomDir, edgeClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));

    }

    beameUtils.findHostPathAndParentAsync(edgeHostname).then(onEdgePathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};


EdgeClientServices.prototype.getStats = function (edgeHostname, callback) {
    var edgeClientDir, atomDir;

    /*---------- private callbacks -------------------*/
    function onRequestValidated() {

        provisionApi.setAuthData(beameUtils.getAuthToken(atomDir, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509));

        var postData = {
            hostname: edgeHostname
        };

        var apiData = beameUtils.getApiData(apiActions.GetStats.endpoint, postData, false);

        provisionApi.runRestfulAPI(apiData, callback, 'GET');

    }

    /**
     *
     * @param {ItemAndParentFolderPath} data
     */
    function onEdgePathReceived(data) {

        edgeClientDir = data['path'];

        atomDir = data['parent_path'];

        isRequestValid(edgeHostname, atomDir, edgeClientDir, false).then(onRequestValidated).catch(beameUtils.onValidationError.bind(null, callback));

    }

    beameUtils.findHostPathAndParentAsync(edgeHostname).then(onEdgePathReceived).catch(beameUtils.onSearchFailed.bind(null, callback, PATH_MISMATCH_DEFAULT_MSG));
};

module.exports = EdgeClientServices;
