/**
 * Created by zenit1 on 03/07/2016.
 */
var debug = require("debug")("./src/services/DeveloperServices.js");
var os = require('os');
var _ = require('underscore');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData

var responseKeys = require('../../config/ResponseKeys.json');
var provisionApi = new (require('../services/ProvisionApi'))();
var dataServices = new (require('../services/DataServices'))();
var beameUtils = require('../utils/BeameUtils');
var apiActions =  require('../../config/ApiConfig.json').Actions.DeveloperApi;

//private callbacks
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

            var developersJSONPath = devPath + beameUtils.metadataFileName;
            var developers = dataServices.readJSON(developersJSONPath);

            developers[payload.hostname] = developerName;

            dataServices.saveFile(developersJSONPath,beameUtils.stringify(developers));

            var devDir = devPath + payload.hostname + '/';

            dataServices.createDir(devDir);

            dataServices.savePayload(devDir + beameUtils.metadataFileName,payload,responseKeys.DeveloperCreateResponseKeys,function(error){
                if(!error){
                  cb &&  cb(null,payload);
                }
                else {
                  cb &&  cb(error,null);
                }
            });

        }
        else {
            cb && cb(error,null);
            debug('Fail: ' + error);
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
 *
 * @param {String|null|undefined} [developerName]
 * @param {Function} callback
 */
DeveloperServices.prototype.createDeveloper = function (developerName, callback) {
    var self = this;

    var authData = beameUtils.getAuthToken(home + "/authData/pk.pem", home + "/authData/x509.pem", false, false);

    provisionApi.setAuthData(authData, function () {

        createDeveloperRequest.call(self, developerName, function (error,payload) {
            if(!error){
                debug({"message":"Developer " + developerName + "created","data": payload});

                callback(null,payload);

                self.getDevCert(payload.hostname,callback);

                return;
            }

            callback(error,null);
        });
        //callback will return null,null so
        //nothing special to do here, this is
        //to use in further activities: update / getCert etc

    });

};

/**
 *
 * @param {String} hostname => developer hostname
 * @param {Function} callback
 */
DeveloperServices.prototype.getDevCert = function (hostname, callback) {
    var errorJson;

    debug('Running test with param: ' + hostname);
    /*---------- check if developer exists -------------------*/
    var devDir = devPath + hostname + "/";
    if (!dataServices.isPathExists(devDir)) {//provided invalid hostname

        errorJson = {"message":"Provided hostname is invalid, list ./.beame to see existing hostnames"};
        console.error(errorJson);
        //    process.exit(-1);
        callback(errorJson, null);
        return;
    }

    /*---------- read developer data and proceed -------------*/
    var developerMetadataPath = devDir + beameUtils.metadataFileName;
    var metadata = dataServices.readJSON(developerMetadataPath);

    if(_.isEmpty(metadata)){
        errorJson = {"message":"metadata.json for " + hostname + " is empty"};
        console.error(errorJson);
        callback && callback(errorJson,null);

    }

    /*----------- generate RSA key + csr and post to provision ---------*/
    var authData = beameUtils.getAuthToken(home + "/authData/pk.pem", home + "/authData/x509.pem", true, true, devDir, hostname);

    provisionApi.setAuthData(authData, function (csr) {
        if (csr != null) {

            var postData = {
                csr: csr,
                uid: metadata.uid
            };

            var apiData = beameUtils.getApiData(apiActions.GetCert.endpoint, postData, true);

            provisionApi.runRestfulAPI(apiData, function (error, payload) {
                if (!error) {

                    dataServices.saveCerts(devDir,payload,responseKeys.CertificateResponseKeys,function(error){
                        if(!error){
                            callback &&  callback(null,payload);
                        }
                        else {
                            callback &&  callback(error,null);
                        }
                    });
                }
                else {
                    errorJson = {"message":"CSR for " + hostname + " failed"};
                    console.error(errorJson);
                    callback(errorJson,null);
                }
            });
        }
        else{
            errorJson = {"message":"CSR for " + hostname + " failed"};
            console.error(errorJson);
            callback && callback(errorJson,null);
        }
    });
};



module.exports = DeveloperServices;
