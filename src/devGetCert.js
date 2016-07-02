//var test=require('../beame-provision-test/main.js');
var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var keys = ["x509", "pkcs7", "ca"];
var debug = require("debug")("./src/devGetCert.js");


/*
 if (process.argv.length < 3) {
 debug('Usage: node '+__filename+' unique-hostname');
 process.exit(-1);
 }*/
var param = process.argv[2];
module.exports.getDevCert = function (param, callback) {
    debug('Running test with param: ' + param);
    /*---------- check if developer exists -------------------*/
    var devDir = devPath + param + "/";
    if (!fs.existsSync(devDir)) {//provided invalid hostname
        debug('Provided hostname is invalid, list ./.beame to see existing hostnames');
        //    process.exit(-1);
        callback(null);
    }
    /*---------- read developer data and proceed -------------*/
    fs.readFile(devDir + "hostname", function (err, data) {
        if (err) throw err;
        var hostname = data;
        fs.readFile(devDir + "uid", function (err, data) {
            if (err) throw err;
            uid = data;


            var authData = {
                pk: home + "/authData/pk.pem",
                x509: home + "/authData/x509.pem",
                generateKeys: true,
                makeCSR: true,
                devPath: devDir,//static path for now, need to generate with uid to allow multiuser tests
                CSRsubj: "C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=" + hostname
            };
            /*----------- generate RSA key + csr and post to provision ---------*/
            provApi.setAuthData(authData, function (csr) { //pk
                if (csr != null) {

                    var postData = {
                        csr: csr,
                        uid: uid
                    };
                    var testParams = {
                        version: "/v1",
                        postData: postData,
                        api: "/dev/getCert",
                        answerExpected: true,
                        decode: false
                    };
                    provApi.runRestfulAPI(testParams, function (err, payload) {
                        if (!err) {
                            var i;
                            for (i = 0; i < keys.length; i++) {
                                if (payload[keys[i]] != undefined) {
                                    debug(keys[i] + ' => OK ');// + payload[keys[i]]);
                                    // next is single test use only,
                                    // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                    fs.writeFile(devDir + keys[i], payload[keys[i]]);
                                }
                                else {
                                    debug('Error, missing <' + keys[i] + '> element in provisioning answer');
                                    //process.exit(-1);
                                    callback(null);
                                }
                            }
                            debug('New dev cert request: successful');
                            callback(payload);
                        }
                        else {
                            debug('Fail: ' + err);
                            callback(null);
                        }
                    });
                }
            });
        });
    });

};
