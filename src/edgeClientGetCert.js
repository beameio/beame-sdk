var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
var os = require('os');
var devPath = os.homedir() + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData
//var edgeEndpointURL = "http://lb-dev.luckyqr.io/endpoint"; //URL to get edge server data
var keys = ["x509", "pkcs7", "ca"];//data that should be returned by the operation
/*-------- files to check to ensure call on available layer ------------*/
var usrFiles = ["uid", "hostname", "x509", "ca", "private_key.pem", "pkcs7"];
var appFiles = ["uid", "hostname", "x509", "ca", "private_key.pem", "pkcs7"];
var edgeFiles = ["uid", "hostname"];
var debug = require("debug")("./src/edgeClientGetCert.js");



/*-------- process arguments --------------------*/
/*if (process.argv.length < 5){ 
 debug('Usage: node '+__filename+' dev-hostname app-hostname edge-client-hostname');
 process.exit(-1);
 }
 var param=process.argv[2];
 var appHostName=process.argv[3];
 var edgeHostName=process.argv[4];*/
module.exports.edgeClientGetCert = function (param, appHostName, edgeHostName, callback) {

    /*---------- check if developer/app/edgeClient exist -------------------*/
    var devDir = devPath + param + "/";
    var devAppDir = devDir + appHostName + "/";
    var edgeClientDir = devAppDir + edgeHostName + "/";
    debug('Running edgeClientGetCert from: ' + edgeClientDir);
    var i;
    for (i = 0; i < usrFiles.length; i++) {
        if (!fs.existsSync(devDir + usrFiles[i])) {
            debug('Error! missing: ' + devDir + usrFiles[i]);
            //process.exit(-1);
            callback(null);
        }
    }
    for (i = 0; i < appFiles.length; i++) {
        if (!fs.existsSync(devAppDir + usrFiles[i])) {
            debug('Error! missing: ' + devAppDir + usrFiles[i]);
            //process.exit(-1);
            callback(null);
        }
    }
    for (i = 0; i < edgeFiles.length; i++) {
        if (!fs.existsSync(edgeClientDir + usrFiles[i])) {
            debug('Error! missing: ' + edgeClientDir + usrFiles[i]);
            //process.exit(-1);
            callback(null);
        }
    }
    /*---------- read access level data and proceed -------------*/
    fs.readFile(edgeClientDir + "hostname", function (err, data) {
        if (err) throw err;
        var hostname = data;
        fs.readFile(edgeClientDir + "uid", function (err, data) {
            if (err) throw err;
            uid = data;

            var authData = {
                pk: devAppDir + "private_key.pem",
                x509: devAppDir + "x509",
                generateKeys: true,
                makeCSR: true,
                devPath: edgeClientDir,
                CSRsubj: "C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=" + hostname
            };
            /*----------- generate RSA key + csr and post to provision ---------*/
            provApi.setAuthData(authData, function (csr) { //pk

                if (authData.makeCSR && csr == null) {
                    debug('CSR creation for app failed');
                    //process.exit(-1);
                    callback(null);
                }
                var postData = {
                    csr: csr,
                    uid: uid
                };
                var testParams = {
                    version: "/v1",
                    postData: postData,
                    api: "/client/getCert",
                    answerExpected: true
                };
                provApi.runRestfulAPI(testParams, function (err, payload) {
                    if (!err) {
                        var nextLevelDir = edgeClientDir;//devAppDir+payload.hostname+'/';
                        if (!fs.existsSync(nextLevelDir)) {
                            fs.mkdirSync(nextLevelDir);//create directory if not exists 
                        }
                        for (i = 0; i < keys.length; i++) {
                            if (payload[keys[i]] != undefined) {
                                debug(keys[i] + ': OK');// + payload[keys[i]]);
                                // next is single test use only,
                                // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                fs.writeFile(nextLevelDir + keys[i], payload[keys[i]]);
                            }
                            else {
                                debug('Error, missing <' + keys[i] + '> element in provisioning answer');
                                //                                process.exit(-1);
                                callback(null);

                            }
                        }
                        callback(payload);
                        debug('Getting edge client certs: successful');
                    }
                    else {
                        debug('Fail: ' + err);
                        callback(null);
                    }
                });
                //            });
            });
        });
    });

};
