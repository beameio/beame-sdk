var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
//var host;//variable to hold hostname
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var Helper = require('./helper.js');
var helper = new Helper();
var keys = ["hostname", "uid"];
var usrFiles = ["uid", "hostname", "x509", "ca", "private_key.pem", "pkcs7"];
var debug = require("debug")("./src/devAppSave.js");


/*
 if (process.argv.length < 4) {
 debug('Usage: node '+__filename+' unique-hostname app-name');
 process.exit(-1);
 }
 var param=process.argv[2];
 var appName=process.argv[3];
 debug('Running test with param: '+param);*/
module.exports.devAppSave = function (param, appName, callback) {

    /*---------- check if developer exists -------------------*/

    var devDir = devPath + param + "/";
    var i;
    for (i = 0; i < usrFiles.length; i++) {
        if (!fs.existsSync(devDir + usrFiles[i])) {
            console.warn('Error! missing: ' + devDir + usrFiles[i]);
            //process.exit(-1);
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

            var authData = helper.getAuthToken(devDir + "private_key.pem",devDir + "x509",false,false,devDir,hostname);

            /*----------- generate RSA key + csr and post to provision ---------*/
            provApi.setAuthData(authData, function () { //csr, pk

                var postData = {
                    name: appName
                };

                var apiData = helper.getApiCallData("/v1","/dev/app/save",postData,true);
                
                provApi.runRestfulAPI(apiData, function (err, payload) {
                    if (!err) {
                        fs.appendFileSync(devDir + 'apps', payload.hostname + '\r\n');
                        var devAppDir = devDir + payload.hostname + '/';
                        if (!fs.existsSync(devAppDir)) {
                            fs.mkdirSync(devAppDir);//create directory for new developer, named with his unique hostname
                        }
                        fs.writeFile(devAppDir + 'name', appName);
                        for (i = 0; i < keys.length; i++) {
                            if (payload[keys[i]] != undefined) {
                                debug(keys[i] + ': ' + payload[keys[i]]);
                                // next is single test use only,
                                // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                fs.writeFile(devAppDir + keys[i], payload[keys[i]]);
                            }
                            else {
                                debug('Error, missing <' + keys[i] + '> element in provisioning answer');
                                //process.exit(-1);
                                callback(null);
                            }
                        }
                        callback(payload);
                        debug('Developer app save: successful');
                    }
                    else {
                        debug('Fail: ' + err);
                    }
                });
            });
        });
    });
};
