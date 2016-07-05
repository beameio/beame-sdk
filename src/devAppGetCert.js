var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
//var host;//variable to hold hostname
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";				//path to store dev data: uid, hostname, key, certs, appData
var Helper = require('./helper.js');
var helper = new Helper();
var keys = ["x509", "pkcs7", "ca"];
var usrFiles = ["uid", "hostname", "x509", "ca", "private_key.pem", "pkcs7"];
var appFiles = ["uid", "hostname"];
var debug = require("debug")("./src/devAppGetCert.js");

/*
 if (process.argv.length < 4) {
 debug('Usage: node '+__filename+' dev-hostname app-hostname');
 process.exit(-1);
 }

 var param=process.argv[2];
 var appHostName=process.argv[3];*/
module.exports.devAppGetCert = function (param, appHostName, callback) {

    /*---------- check if developer exists -------------------*/
    var devDir = devPath + param + "/";
    var devAppDir = devDir + appHostName + "/";
    debug('Running appGetCert from: ' + devAppDir);
    var i = 0;
    for (i = 0; i < usrFiles.length; i++) {
        if (!fs.existsSync(devDir + usrFiles[i])) {
            console.warn('Error! missing: ' + devDir + usrFiles[i]);
            //process.exit(-1);
            callback(null);
        }
    }
    for (i = 0; i < appFiles.length; i++) {
        if (!fs.existsSync(devAppDir + usrFiles[i])) {
            console.warn('Error! missing: ' + devAppDir + usrFiles[i]);
            //process.exit(-1);
            callback(null);
        }
    }
    /*---------- read developer data and proceed -------------*/
    fs.readFile(devAppDir + "hostname", function (err, data) {
        if (err) throw err;
        var hostname = data;
        fs.readFile(devAppDir + "uid", function (err, data) {
            if (err) throw err;
            uid = data;


            var authData = helper.getAuthToken(devDir + "private_key.pem",devDir + "x509",true,true,devAppDir,hostname);


            /*----------- generate RSA key + csr and post to provision ---------*/
            provApi.setAuthData(authData, function (csr) { //pk
                if (csr == null) {
                    debug('CSR creation for app failed');
                    //process.exit(-1);
                    callback(null);
                }
                var postData = {
                    uid: uid,
                    csr: csr
                };

                var apiData = helper.getApiCallData("/v1","/dev/getAppCert",postData,true);
                
                provApi.runRestfulAPI(apiData, function (err, payload) {
                    if (!err) {
                        for (i = 0; i < keys.length; i++) {
                            if (payload[keys[i]] != undefined) {
                                debug(keys[i] + ' => OK');// + ': ' + payload[keys[i]]);
                                // next is single test use only,
                                // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                fs.writeFile(devAppDir + keys[i], payload[keys[i]]);
                            }
                            else {
                                debug('Error, missing <' + keys[i] + '> element in provisioning answer');
                                //	process.exit(-1);
                                callback(null);
                            }
                        }
                        debug('Developer app get certs: successful');
                        callback(payload);
                    }
                    else {
                        debug('Fail: ' + err);
                        callback(null);
                    }
                });
            });
        });
    });

};
