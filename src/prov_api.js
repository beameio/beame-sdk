'use strict';

var commonEPprefix="https://prov-staging.beameio.net/api";
var answerExpected=false;
var testData = null;

//next is for reference only:
var paramKeys=["version","postData","api","answerExpected","decode"];

//reused from ProvApiervice
var exports = module.exports;


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

/**
 * @typedef {Object} ProvApiResponse
 * @property {String} StatusCode
 * @property {String} ErrorMessage
 * @property {String} Message
 * @property {Boolean} IsSuccess
 * @property {Object} Payload
 */


var _ = require('underscore');
var request = require('request');
var pem = require('pem');
var fs = require('fs');
var sys = require('sys');
var exec = require('child_process').exec;//needed to run openssl cli

//private helpers
var parseProvisionResponse = function (error, response, body, type, callback) {
    console.log('Host responded with status <'+response.statusCode+'>');
    
    if (error) {
        console.error('provision error', error);
        callback(error, null);
        return;
    }

    /** @type {ProvApiResponse} */

    if (response.statusCode == 200) {
        //noinspection JSUnresolvedVariable
		//

		var resp;
        if(testData.answerExpected){
            resp = JSON.parse(body);
            if (!resp) {
                console.error('Wrong response from provisioning api(' + type + '):', body);
                throw new Error('Wrong response from provisioning api(' + type + '): ' + utils.stringify(resp));
            }

						callback(null, resp);
        }
        else{
            var tmpResp="{\"updateStatus\":\"pass\"}";
            resp=JSON.parse(tmpResp);
            callback(null,resp);
        }
    }
    else {
        callback(body+':status:'+response.statusCode, null);
    }
};

var postToProvisionApi = function (url, options, type, callback) {
    console.log('postToProvision: '+url);
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

var privateKey;
var secretKey;


exports.setAuthData = function(authData,cb){
    console.log('reading auth data: pk<' + authData.pk+'> <'+authData.x509+'>');
    this.options = {
        key: fs.readFileSync(authData.pk),
        cert: fs.readFileSync(authData.x509)
    };
    var devPK=this.options.key;
    if(authData.generateKeys || authData.makeCSR){
/* --------- generate RSA key: ------------------------------------------------*/
        var cmd="openssl genrsa 2048";
        if(!authData.generateKeys)
            cmd="echo \""+devPK+"\"";
        console.log('generating private key with: '+cmd);
        var child = exec(cmd, function (error, stdout, stderr) {
            var devPK = stdout;
//            console.log('devPK: '  + devPK);
            if (error !== null) {
                console.log('stderr: ' + stderr);
/* -------  put error handler to deal with possible openssl failure -----------*/
                console.log('Failed to generate Private Key: ' + error);
            }
            //else{//store RSA key in developer data
            var pkFile=authData.devPath+"private_key.pem";
            fs.writeFile(pkFile, devPK, function(err) {
                if(err) {
                    return console.log(err);
                }
                //else
                cmd="openssl req -key "+pkFile+" -new -subj \"/"+authData.CSRsubj+"\""; 
                console.log('CLI: '+cmd);
                child = exec(cmd, function (error, stdout, stderr) {
                    if (error !== null) {
                        console.log('stderr: ' + stderr);
/* ------------- put error handler to deal with possible openssl failure ---------*/
                        console.log('exec error: ' + error);
                    }
                    //else
                    var CSR=stdout;
                    cb(CSR,devPK);
                });
            });
        });
    }
    else{
        cb(null,null);
    }
}

exports.getEndpoint = function (url, cb){
    testData={answerExpected:false};
    request.get(url)
    .on('response',function(res){
        res.on('data',function(body){
            console.log('Endpoint answer: '+body);
            cb(null, JSON.parse(body));
        });
    })
    .on('error',function(err){
        cb(err, null);
    });
}

//noinspection JSUnusedGlobalSymbols
//var paramKeys=["version","postData","api","answerExpected","decode"];
exports.runRestfulAPI = function (inParams, callback) {
    testData=inParams;
    
    var options = _.extend(this.options, {form: testData.postData});
    var apiEndpoint=commonEPprefix+testData.version+testData.api;
    console.log('Posting to: '+apiEndpoint);
    postToProvisionApi(apiEndpoint, options, testData.api, callback);
};
