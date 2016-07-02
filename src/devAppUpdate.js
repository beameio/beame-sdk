var test = require('./prov_api.js');
var provApi = new test();
var fs = require('fs');
var uid;//variable to hold UID
var os = require('os');
var devPath = os.homedir() + "/.beame/";				//path to store dev data: uid, hostname, key, certs, appData
var keys = ["updateStatus"];
var usrFiles = ["uid", "hostname", "x509", "ca", "private_key.pem", "pkcs7"];
var appFiles = ["uid", "hostname"];

if (process.argv.length < 5) {
    console.log('Usage: node ' + __filename + ' dev-hostname app-hostname newAppName');
    process.exit(-1);
}

var param = process.argv[2];
var appHostName = process.argv[3];
var appName = process.argv[4];
console.log('Running test with param: ' + param);

/*---------- check if developer exists -------------------*/

var devDir = devPath + param + "/";
var devAppDir = devDir + appHostName + "/";
var i;

for (i = 0; i < usrFiles.length; i++) {
    if (!fs.existsSync(devDir + usrFiles[i])) {
        console.log('Error! missing: ' + devDir + usrFiles[i]);
        process.exit(-1);
    }
}

for (i = 0; i < appFiles.length; i++) {
    if (!fs.existsSync(devAppDir + usrFiles[i])) {
        console.log('Error! missing: ' + devAppDir + usrFiles[i]);
        process.exit(-1);
    }
}

/*---------- read developer data and proceed -------------*/
fs.readFile(devAppDir + "hostname", function (err, data) {
    if (err) throw err;
    var hostname = data;
    fs.readFile(devAppDir + "uid", function (err, data) {
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
        provApi.setAuthData(authData, function (csr) { //pk
            if (csr == null && authData.createCSR) {
                console.log('CSR creation for app failed');
                process.exit(-1);
            }

            var postData = {
                name: appName
            };

            var testParams = {
                version: "/v1",
                postData: postData,
                api: "/dev/app/" + uid + "/update",
                answerExpected: false
            };

            provApi.runRestfulAPI(testParams, function (err, payload) {
                if (!err) {
                    for (i = 0; i < keys.length; i++) {
                        if (payload[keys[i]] != undefined) {
                            console.log(keys[i] + ': ' + payload[keys[i]]);
                            // next is single test use only,
                            // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                            fs.writeFile(devAppDir + keys[i], payload[keys[i]]);
                        }
                        else {
                            console.log('Error, missing <' + keys[i] + '> element in provisioning answer');
                            process.exit(-1);
                        }
                    }
                    console.log('Developer app save: successful');
                }
                else {
                    console.log('Fail: ' + err);
                }
            });
        });
    });
});


