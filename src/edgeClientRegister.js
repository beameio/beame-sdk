var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
var os = require('os');
var devPath = os.homedir() + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var Helper = require('./helper.js');
var helper = new Helper();
var keys = ["uid", "hostname","edgeHostname"];
var usrFiles = ["uid", "hostname", "edgeHostname", "x509", "ca", "private_key.pem", "pkcs7"];
var appFiles = ["uid", "hostname", "edgeHostname", "x509", "ca", "private_key.pem", "pkcs7"];
/*if (process.argv.length < 4){
 console.log('Usage: node '+__filename+' dev-hostname app-hostname');
 process.exit(-1);
 }
 var param=process.argv[2];
 var appHostName=process.argv[3];
 //var zone=process.argv[4];*/
module.exports.edgeClientRegister = function (param, appHostName, callback) {

    /*---------- check if developer exists -------------------*/
    var devDir = devPath + param + "/";
    var devAppDir = devDir + appHostName + "/";
    console.log('Running edge client registration from: ' + devAppDir);
    var i;
    for (i = 0; i < usrFiles.length; i++) {
        if (!fs.existsSync(devDir + usrFiles[i])) {
            console.log('Error! missing: ' + devDir + usrFiles[i]);
            //process.exit(-1);
            callback(null);
        }
    }
    for (i = 0; i < appFiles.length; i++) {
        if (!fs.existsSync(devAppDir + usrFiles[i])) {
            console.log('Error! missing: ' + devAppDir + usrFiles[i]);
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

            var authData = helper.getAuthToken(devAppDir + "private_key.pem",devAppDir + "x509",false,false,devAppDir,hostname);

            /*----------- generate RSA key + csr and post to provision ---------*/
            provApi.setAuthData(authData, function (csr) { //pk
                provApi.getEndpoint("http://lb-dev.luckyqr.io/endpoint", function (err, endpointData) {
                    if (authData.makeCSR && csr == null) {
                        console.log('CSR creation for app failed');
                        //process.exit(-1);
                        callback(null);
                    }
                    if (err != null || endpointData.endpoint == undefined) {
                        console.log('Failed to get Endpoint data: ' + err);
                        //process.exit(-1);
                        callback(null);
                    }
                    var postData = {
                        host: endpointData.endpoint
                    };
                    console.log('Registering edge client for endpoint: ' + postData.host);

                    var apiData = helper.getApiCallData("/v1","/client/register",postData,true);

                    
                    provApi.runRestfulAPI(apiData, function (err, payload) {
                        if (!err) {
                            fs.appendFileSync(devAppDir + 'edgeClients', payload.hostname + '\r\n');
                            var nextLevelDir = devAppDir + payload.hostname + '/';
                            if (!fs.existsSync(nextLevelDir)) {
                                fs.mkdirSync(nextLevelDir);//create directory for new developer, named with his unique hostname
                            }
                            fs.writeFile(nextLevelDir + 'name', 'instance');
                            for (i = 0; i < keys.length; i++) {
                                if (payload[keys[i]] != undefined) {
                                    console.log(keys[i] + ': ' + payload[keys[i]]);
                                    // next is single test use only,
                                    // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                    fs.writeFile(nextLevelDir + keys[i], payload[keys[i]]);
                                }
                                else {
                                    console.warn('Error, missing <' + keys[i] + '> element in provisioning answer');
                                    //process.exit(-1);
                                    callback(null);
                                }

                            }
                            callback(payload);
                            console.log('Edge register: successful');
                        }
                        else {
                            console.log('Fail: ' + err);
                            callback(null);
                        }
                    });
                });
            });
        });
    });

};
