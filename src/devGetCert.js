//var test=require('../beame-provision-test/main.js');
var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
var os = require('os');
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var keys = ["x509", "pkcs7", "ca"];
var Helper = require('./helper.js');
var helper = new Helper();
/*
 if (process.argv.length < 3) {
 console.log('Usage: node '+__filename+' unique-hostname');
 process.exit(-1);
 }*/
var param = process.argv[2];
module.exports.getDevCert = function (param, callback) {
    console.log('Running test with param: ' + param);
    /*---------- check if developer exists -------------------*/
    var devDir = devPath + param + "/";
    if (!fs.existsSync(devDir)) {//provided invalid hostname
        console.log('Provided hostname is invalid, list ./.beame to see existing hostnames');
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


            var authData = helper.getAuthToken(home + "/authData/pk.pem",home + "/authData/x509.pem",true,true,devDir,hostname);

            /*----------- generate RSA key + csr and post to provision ---------*/
            provApi.setAuthData(authData, function (csr) { //pk
                if (csr != null) {

                    var postData = {
                        csr: csr,
                        uid: uid
                    };

                    var apiData = helper.getApiCallData("/v1","/dev/getCert",postData,true);
                   
                    provApi.runRestfulAPI(apiData, function (err, payload) {
                        if (!err) {
                            var i;
                            for (i = 0; i < keys.length; i++) {
                                if (payload[keys[i]] != undefined) {
                                    console.log(keys[i] + ' => OK ');// + payload[keys[i]]);
                                    // next is single test use only,
                                    // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                    fs.writeFile(devDir + keys[i], payload[keys[i]]);
                                }
                                else {
                                    console.log('Error, missing <' + keys[i] + '> element in provisioning answer');
                                    //process.exit(-1);
                                    callback(null);
                                }
                            }
                            console.log('New dev cert request: successful');
                            callback(payload);
                        }
                        else {
                            console.log('Fail: ' + err);
                            callback(null);
                        }
                    });
                }
            });
        });
    });

};
