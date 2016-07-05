/**
 * Created by zenit1 on 03/07/2016.
 */
var debug = require("debug")("DeveloperServices");
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData

var responseKeys = require('../../config/ResponseKeys.json');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions = require('../../config/ApiConfig.json').Actions.DeveloperApi;

//private methods

/**
 *
 * @param {Object} developerName
 * @param {Function} cb
 * @this {DeveloperServices}
 */
var createDeveloperRequest = function (developerName, cb) {

    var postData = {
        name: developerName
    };

    var apiData = beameUtils.getApiData(apiActions.CreateDeveloper.endpoint, postData, true);

    provisionApi.runRestfulAPI(apiData, function (error, payload) {
        if (!error) {

            payload.name = developerName;

            var devDir = devPath + payload.hostname + '/';

            dataServices.createDir(devDir);

            dataServices.savePayload(devDir + global.metadataFileName, payload, responseKeys.DeveloperCreateResponseKeys, function (error) {
                if (!cb) return;

                if (!error) {
                    cb(null, payload);
                }
                else {
                    cb(error, null);
                }
            });

        }
        else {
            var msg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.ApiRestError, "Rest Api Error", {"error": error});
            console.error(msg);
            cb && cb(msg, null);
        }

    });
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

    self.registerDeveloper(developerName, function (error, payload) {
        if (!error) {

            var hostname = payload.hostname;

            self.getCert(hostname, function (error) {
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
 * @param {String|null|undefined} [developerName]
 * @param {Function} callback
 */
DeveloperServices.prototype.registerDeveloper = function (developerName, callback) {
    var self = this;

    var authData = beameUtils.getAuthToken(home + global.authData.PK_PATH, home + global.authData.CERT_PATH, false, false);

    provisionApi.setAuthData(authData, function () {

        createDeveloperRequest.call(self, developerName, callback);

    });

};

/**
 *
 * @param {String} hostname => developer hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.getCert = function (hostname, callback) {
    var errMsg;
    var devDir = devPath + hostname + "/";

    if (!hostname) {
        errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.HostnameRequired, "Get developer certs, hostname missing", {"error": "hostname missing"});
        debug(errMsg);

        callback && callback(errMsg, null);
        return;
    }

    /*---------- private callbacks -------------------*/
    function onMetaInfoReceived(metadata) {
        /*----------- generate RSA key + csr and post to provision ---------*/
        var authData = beameUtils.getAuthToken(home + global.authData.PK_PATH, home + global.authData.CERT_PATH, true, true, devDir, hostname);

        provisionApi.setAuthData(authData, function (csr) {
            if (csr != null) {

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
                        errMsg = {"message": "CSR for " + hostname + " failed"};
                        console.error(errMsg);
                        callback(errMsg, null);
                    }
                });
            }
            else {
                errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.CSRCreationFailed, "CSR not created", {"hostname": hostname});
                console.error(errMsg);
                callback && callback(errMsg, null);
            }
        });
    }

    function onPathValidated(){
        /*---------- read developer data and proceed -------------*/
        beameUtils.getNodeMetadata(devDir, hostname, global.AppModules.Developer).then(onMetaInfoReceived, onValidationError);
    }

    function onValidationError(error){
        callback(error, null);
    }

    beameUtils.isHostnamePathValid(devDir, global.AppModules.Developer, hostname).then(onPathValidated,onValidationError);
};

/**
 *
 * @param {String} hostname => developer hostname
 * @param {String} email
 * @param {String|null|undefined} [name]
 * @param {Function} callback
 */
DeveloperServices.prototype.updateProfile = function (hostname, email, name, callback) {
    var errMsg;
    var devDir = devPath + hostname + "/";

    /*---------- private callbacks -------------------*/
    function onMetaInfoReceived(metadata) {
        var authData = beameUtils.getAuthToken(devDir + global.CertFileNames.PRIVATE_KEY, devDir + global.CertFileNames.X509, false, false, devDir, hostname);

        provisionApi.setAuthData(authData, function () {

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

                    dataServices.saveFile(devDir + global.metadataFileName, beameUtils.stringify(metadata));

                    callback(null, metadata);
                }
                else {
                    errMsg = global.formatDebugMessage(global.AppModules.Developer, global.MessageCodes.ApiRestError, "developer update profile API error", {"error": error});
                    console.error(errMsg);
                    callback(error, null);
                }
            });
        });

    }

    function onCertsValidated(){
        /*---------- read developer data and proceed -------------*/
        beameUtils.getNodeMetadata(devDir, hostname, global.AppModules.Developer).then(onMetaInfoReceived, onValidationError);
    }

    function onValidationError(error){
        callback(error, null);
    }

    beameUtils.isNodeCertsExists(devDir,responseKeys.NodeFiles,global.AppModules.Developer,hostname,global.AppModules.Developer).then(onCertsValidated,onValidationError);

};

module.exports = DeveloperServices;
