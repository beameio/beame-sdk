'use strict';
var debug = require("debug")("./src/prov_api.js");


var commonEPprefix = "https://prov-staging.beameio.net/api";
//var answerExpected = false;
var testData = null;

//next is for reference only:
//var paramKeys = ["version", "postData", "api", "answerExpected", "decode"];



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
var sys = require('sys');
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
            payload = {updateStatus:'pass'};//body;
        }
    }
    else {
        payload = response.statusCode == 200 ? {updateStatus:'pass'} : "empty";
    }


    if (response.statusCode == 200) {

        callback && callback(null, payload);
    }
    else {
        callback(body + ':status:' + response.statusCode, null);
    }

    // if (response.statusCode == 200) {
    //     //noinspection JSUnresolvedVariable
    //     //
    //
    //     var resp;
    //     if (testData.answerExpected) {
    //         resp = JSON.parse(body);
    //         if (!resp) {
    //             console.error('Wrong response from provisioning api(' + type + '):', body);
    //             throw new Error('Wrong response from provisioning api(' + type + '): ' + JSON.stringify(resp, null, 2));
    //         }
    //
    //         callback(null, resp);
    //     }
    //     else {
    //         var tmpResp = "{\"updateStatus\":\"pass\"}";
    //         resp = JSON.parse(tmpResp);
    //         callback(null, resp);
    //     }
    // }
    // else {
    //     callback(body + ':status:' + response.statusCode, null);
    // }
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
var ProvApiService = function () {};

ProvApiService.prototype.setAuthData = function (authData, cb) {
    debug('reading auth data: pk<' + authData.pk + '> <' + authData.x509 + '>');
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
        debug('generating private key with: ' + cmd);
        var child = exec(cmd, function (error, stdout, stderr) {
            var devPK = stdout;
//            debug('devPK: '  + devPK);
            if (error !== null) {
                debug('stderr: ' + stderr);
                /* -------  put error handler to deal with possible openssl failure -----------*/
                debug('Failed to generate Private Key: ' + error);
            }
            //else{//store RSA key in developer data
            var pkFile = authData.devPath + "private_key.pem";
            fs.writeFile(pkFile, devPK, function (err) {
                if (err) {
                    return debug(err);
                }
                //else
                cmd = "openssl req -key " + pkFile + " -new -subj \"/" + authData.CSRsubj + "\"";
                debug('CLI: ' + cmd);
                try{
                    child = exec(cmd,
                        /**
                         *
                         * @param error
                         * @param stdout => return CSR
                         * @param stderr
                         */
                        function (error, stdout, stderr) {
                            if (error !== null) {
                                debug('stderr: ' + stderr);
                                /* ------------- put error handler to deal with possible openssl failure ---------*/
                                debug('exec error: ' + error);
                            }
                            cb && cb(stdout, devPK);
                        });
                }
                catch(error){
                    console.error('create developer csr',error);
                }
            });
        });
    }
    else {
        cb(null, null);
    }
};

ProvApiService.prototype.getEndpoint = function (url, cb) {
    testData = {answerExpected: false};
    request.get(url)
        .on('response', function (res) {
            res.on('data', function (body) {
                debug('Endpoint answer: ' + body);
                cb(null, JSON.parse(body));
            });
        })
        .on('error', function (err) {
            cb(err, null);
        });
};

ProvApiService.prototype.runRestfulAPI = function (inParams, callback) {
    testData = inParams;

    var options = _.extend(this.options, {form: testData.postData});
    var apiEndpoint = commonEPprefix + testData.version + testData.api;
    debug('Posting to: ' + apiEndpoint);
    postToProvisionApi(apiEndpoint, options, testData.api, callback);
};


module.exports = ProvApiService;
