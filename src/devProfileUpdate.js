//var test=require('../beame-provision-test/main.js');
var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
var os = require('os');
var devPath = os.homedir() + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var Helper = require('./helper.js');
var helper = new Helper();
var keys = ["updateStatus"];
var usrFiles = ["uid", "hostname", "x509", "ca", "private_key.pem", "pkcs7"];
/*
 if (process.argv.length < 3) {
 console.log('Usage: node '+__filename+' unique-hostname');
 process.exit(-1);
 }
 var param=process.argv[2];*/

module.exports.devProfileUpdate = function (param, callback) {

    /*---------- check if developer exists -------------------*/
    var devDir = devPath + param + "/";
    var i;
    console.log('Running profile update from: ' + devDir);
    for (i = 0; i < usrFiles.length; i++) {
        if (!fs.existsSync(devDir + usrFiles[i])) {
            console.log('Error! missing: ' + devDir + usrFiles[i]);
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

            var authData = helper.getAuthToken(devDir + "private_key.pem",devDir + "x509",false,false,devDir,hostname);

            /*----------- generate RSA key + csr and post to provision ---------*/
            provApi.setAuthData(authData, function () { //csr, pk

                var postData = {
                    email: "zglozman@beame.io"
                };

                var apiData = helper.getApiCallData("/v1","/dev/profile/update",postData,false);


                provApi.runRestfulAPI(apiData, function (err, payload) {
                    if (!err) {
                        for (i = 0; i < keys.length; i++) {
                            if (payload[keys[i]] != undefined) {
                                console.log(keys[i] + ': ' + payload[keys[i]]);
                                // next is single test use only,
                                // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                //                    fs.writeFile(devDir+keys[i],payload[keys[i]]);
                            }
                            else {
                                console.log('Error, missing <' + keys[i] + '> element in provisioning answer');
                                process.exit(-1);
                            }
                        }
                        console.log('Developer profile update: successful');
                        callback("success");
                    }
                    else {
                        console.log('Fail: ' + err);
                        callback("Fail");
                    }
                });
            });
        });
    });
};
