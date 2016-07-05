'use strict';
require('../utils/Globals');
var debug = require("debug")("./src/services/ProvisionApi.js");
var provisionSettings = require('../../config/ApiConfig.json');
var beameUtils = require('../utils/BeameUtils');

/**
 * @typedef {Object} CertSettings
 * @property {String} appCertPath
 * @property {String} x509Name
 * @property {String} pkName
 */

/**
 * @typedef {Object} OrderPemResponse
 * @property {String} x509
 * @property {String} ca
 * @property {String} pkcs7
 */

/**
 * @typedef {Object} ProvEndpointResponse
 * @property {String} uid
 * @property {String} hostname
 */


var _ = require('underscore');
var request = require('request');
var fs = require('fs');
//var sys = require('sys');
var exec = require('child_process').exec;//needed to run openssl cli

//private helpers
var parseProvisionResponse = function (error, response, body, type, callback) {
    var errMsg;
    if (!response) {
        callback && callback(new Error('empty response'), null);
        return;
    }

    if (error) {
        errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.ApiRestError, "Provision Api response error", {"error": error});
        callback(errMsg, null);
        return;
    }

    /** @type {Object|null|undefined} */
    var payload;

    if (body) {
        try {
            payload = JSON.parse(body);

            delete payload['$id'];
        }
        catch (err) {
            payload = {message: body};
        }
    }
    else {
        payload = response.statusCode == 200 ? {updateStatus: 'pass'} : "empty";
    }


    if (response.statusCode == 200) {

        callback && callback(null, payload);
    }
    else {
        //noinspection JSUnresolvedVariable
        errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.ApiRestError, "Provision Api response error", {
            "status": response.statusCode,
            "message": payload.Message || payload
        });

        callback && callback(errMsg, null);
    }

};

var postToProvisionApi = function (url, options, type, callback) {
    debug('postToProvision: ' + url);
    request.post(
        url,
        options,
        function (error, response, body) {
            parseProvisionResponse(error, response, body, type, function (error, payload) {
                if (payload) {
                    callback(null, payload);
                }
                else {
                    callback(error, null);
                }
            });
        }
    );
};

/**
 * Empty constructor
 * @constructor
 */
var ProvApiService = function () {

    /** @member {String} **/
    this.provApiEndpoint = beameUtils.isAmazon() ? provisionSettings.Endpoints.Online : provisionSettings.Endpoints.Local;
    debug(global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.DebugInfo, "Provision Api Constructor", {"endpoint": this.provApiEndpoint}));

};

/**
 *
 * @param {AuthData} authData
 */
ProvApiService.prototype.setAuthData = function (authData) {
    var errMsg;
    //debug('reading auth data: pk<' + authData.pk + '> <' + authData.x509 + '>');
    this.options = {
        key: fs.readFileSync(authData.pk),
        cert: fs.readFileSync(authData.x509)
    };
    // var devPK = this.options.key;
    // if (authData.generateKeys || authData.makeCSR) {
    //     /* --------- generate RSA key: ------------------------------------------------*/
    //     var cmd = "openssl genrsa 2048";
    //     if (!authData.generateKeys)
    //         cmd = "echo \"" + devPK + "\"";
    //
    //     debug(global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.DebugInfo, "generating private key with", {"cmd": cmd}));
    //
    //     var child = exec(cmd, function (error, stdout, stderr) {
    //         var devPK = stdout;
    //
    //         if (error !== null) {
    //             /* -------  put error handler to deal with possible openssl failure -----------*/
    //             debug(global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Failed to generate Private Key", {
    //                 "error": error,
    //                 "stderr": stderr
    //             }));
    //         }
    //
    //         var pkFile = authData.devPath + global.CertFileNames.PRIVATE_KEY;
    //
    //         try {
    //             fs.writeFileSync(pkFile, devPK);
    //
    //             cmd = "openssl req -key " + pkFile + " -new -subj \"/" + authData.CSRsubj + "\"";
    //
    //             try {
    //                 child = exec(cmd,
    //                     /**
    //                      *
    //                      * @param error
    //                      * @param stdout => return CSR
    //                      * @param stderr
    //                      */
    //                     function (error, stdout, stderr) {
    //                         if (error !== null) {
    //                             errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Failed to generate CSR", {
    //                                 "error": error,
    //                                 "stderr": stderr
    //                             });
    //                             console.error(errMsg);
    //                             cb && cb(errMsg, null);
    //                         }
    //                         else {
    //                             cb && cb(stdout);
    //                         }
    //
    //                     });
    //             }
    //             catch (error) {
    //                 errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Create Developer CSR", {"error": error});
    //                 console.error(errMsg);
    //                 cb && cb(errMsg, null);
    //             }
    //         }
    //         catch (error) {
    //             errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Failed to save Private Key", {"error": error});
    //             console.error(errMsg);
    //             cb && cb(errMsg, null);
    //         }
    //     });
    // }
    // else {
    //     cb(null, true);
    // }
};

/**
 *
 * @param {ApiData} apiData
 * @param {Function} callback
 */
ProvApiService.prototype.runRestfulAPI = function (apiData, callback) {

    var options = _.extend(this.options, {form: apiData.postData});
    var apiEndpoint = this.provApiEndpoint + apiData.api;
    debug('Posting to: ' + apiEndpoint);
    postToProvisionApi(apiEndpoint, options, apiData.api, callback);
};


module.exports = ProvApiService;
