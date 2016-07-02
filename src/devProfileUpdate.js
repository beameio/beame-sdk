//var test=require('../beame-provision-test/main.js');
var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
var os = require('os');
var devPath = os.homedir() + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var keys = ["updateStatus"];
var usrFiles = ["uid", "hostname", "x509", "ca", "private_key.pem", "pkcs7"];
var debug = require("debug")("./src/devProfileUpdate.js");



/*
 if (process.argv.length < 3) {
 debug('Usage: node '+__filename+' unique-hostname');
 process.exit(-1);
 }
 var param=process.argv[2];*/

module.exports.devProfileUpdate = function (param, callback) {

    /*---------- check if developer exists -------------------*/
    var devDir = devPath + param + "/";
    var i;
    debug('Running profile update from: ' + devDir);
    for (i = 0; i < usrFiles.length; i++) {
        if (!fs.existsSync(devDir + usrFiles[i])) {
            debug('Error! missing: ' + devDir + usrFiles[i]);
            //       process.exit(-1);
            callback(null);
        }
    }

    /*---------- read developer data and proceed -------------*/
    fs.readFile(devDir + "hostname", function (err, data) {
        if (err) throw err;
        var hostname = data;
        fs.readFile(devDir + "uid", function (err, data) {
            if (err) throw err;
            uid = data;

            var authData = {
                pk: devDir + "private_key.pem",
                x509: devDir + "x509",
                generateKeys: false,
                makeCSR: false,
                devPath: devDir,
                CSRsubj: "C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=" + hostname
            };

            /*----------- generate RSA key + csr and post to provision ---------*/
            provApi.setAuthData(authData, function () { //csr, pk

                var postData = {
                    email: "zglozman@beame.io"
                };
                var testParams = {
                    version: "/v1",
                    postData: postData,
                    api: "/dev/profile/update",
                    answerExpected: false,
                    decode: false
                };

                provApi.runRestfulAPI(testParams, function (err, payload) {
                    if (!err) {
                        for (i = 0; i < keys.length; i++) {
                            if (payload[keys[i]] != undefined) {
                                debug(keys[i] + ': ' + payload[keys[i]]);
                                // next is single test use only,
                                // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                //                    fs.writeFile(devDir+keys[i],payload[keys[i]]);
                            }
                            else {
                                debug('Error, missing <' + keys[i] + '> element in provisioning answer');
                                process.exit(-1);
                            }
                        }
                        debug('Developer profile update: successful');
                        callback("success");
                    }
                    else {
                        debug('Fail: ' + err);
                        callback("Fail");
                    }
                });
            });
        });
    });
};
