'use strict';

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
var pem = require('pem');
var fs = require('fs');
//var sys = require('sys');
var exec = require('child_process').exec;//needed to run openssl cli

//private helpers
var parseProvisionResponse = function (error, response, body, type, callback) {
    debug('Host responded with status <' + response.statusCode + '>');

    if (error) {
        console.error('provision error', error);
        callback(error, null);
        return;
    }

    /** @type {Object|null|undefined} */
    var payload;

    if (body) {
        try {
            payload = JSON.parse(body);
        }
        catch (err) {
            payload = {updateStatus: 'pass'};//body;
        }
    }
    else {
        payload = response.statusCode == 200 ? {updateStatus: 'pass'} : "empty";
    }


    if (response.statusCode == 200) {

        callback && callback(null, payload);
    }
    else {
        callback && callback(body + ':status:' + response.statusCode, null);
    }

};

var postToProvisionApi = function (url, options, type, callback) {
    debug('postToProvision: ' + url);
    request.post(
        url,
        options,
        function (error, response, body) {
            parseProvisionResponse(error, response, body, type, function (err, payload) {
                if (payload) {
                    callback(null, payload);
                }
                else {
                    callback(err, null);
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
    debug(beameUtils.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.DebugInfo, "Provision Api Constructor", {"endpoint": this.provApiEndpoint}));

};

/**
 *
 * @param {AuthData} authData
 * @param {Function} cb
 */
ProvApiService.prototype.setAuthData = function (authData, cb) {
    var errMsg;
    //debug('reading auth data: pk<' + authData.pk + '> <' + authData.x509 + '>');
    this.options = {
        key: fs.readFileSync(authData.pk),
        cert: fs.readFileSync(authData.x509)
    };
    var devPK = this.options.key;
    if (authData.generateKeys || authData.makeCSR) {
        /* --------- generate RSA key: ------------------------------------------------*/
        var cmd = "openssl genrsa 2048";
        if (!authData.generateKeys)
            cmd = "echo \"" + devPK + "\"";

        debug(beameUtils.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.DebugInfo, "generating private key with", {"cmd": cmd}));

        var child = exec(cmd, function (error, stdout, stderr) {
            var devPK = stdout;
//            debug('devPK: '  + devPK);
            if (error !== null) {
                /* -------  put error handler to deal with possible openssl failure -----------*/
                debug(beameUtils.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Failed to generate Private Key", {
                    "error": error,
                    "stderr": stderr
                }));
            }
            //else{//store RSA key in developer data
            var pkFile = authData.devPath + global.CertFileNames.PRIVATE_KEY;

            try {
                fs.writeFileSync(pkFile, devPK);

                cmd = "openssl req -key " + pkFile + " -new -subj \"/" + authData.CSRsubj + "\"";

                try {
                    child = exec(cmd,
                        /**
                         *
                         * @param error
                         * @param stdout => return CSR
                         * @param stderr
                         */
                        function (error, stdout, stderr) {
                            if (error !== null) {
                                errMsg = beameUtils.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Failed to generate CSR", {
                                    "error": error,
                                    "stderr": stderr
                                });
                                console.error(errMsg);
                                cb && cb(errMsg, null);
                            }
                            else {
                                cb && cb(stdout);
                            }

                        });
                }
                catch (error) {
                    errMsg = beameUtils.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Create Developer CSR", {"error": error});
                    console.error(errMsg);
                    cb && cb(errMsg, null);
                }
            }
            catch (error) {
                errMsg = beameUtils.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Failed to save Private Key", {"error": error});
                console.error(errMsg);
                cb && cb(errMsg, null);
            }
        });
    }
    else {
        cb(null, null);
    }
};

// ProvApiService.prototype.getEndpoint = function (url, cb) {
//     testData = {answerExpected: false};
//     request.get(url)
//         .on('response', function (res) {
//             res.on('data', function (body) {
//                 debug('Endpoint answer: ' + body);
//                 cb(null, JSON.parse(body));
//             });
//         })
//         .on('error', function (err) {
//             cb(err, null);
//         });
// };

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
