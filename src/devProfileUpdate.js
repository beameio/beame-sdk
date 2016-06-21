//var test=require('../beame-provision-test/main.js');
var test=require('beame-provision-test');
var fs=require('fs');
var uid;//variable to hold UID
var host;//variable to hold hostname
var devPath = "./.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var keys = ["updateStatus"];
var usrFiles = ["uid","hostname","x509","ca","private_key.pem","pkcs7"];
/*
if (process.argv.length < 3) {
    console.log('Usage: node '+__filename+' unique-hostname');
    process.exit(-1);
}
var param=process.argv[2];*/
module.exports.devProfileUpdate = function(param,callback){

/*---------- check if developer exists -------------------*/
var devDir=devPath+param+"/";
var i;
console.log('Running profile update from: '+devDir);
for(i=0;i<usrFiles.length;i++){
    if(!fs.existsSync(devDir+usrFiles[i])){
        console.log('Error! missing: '+devDir+usrFiles[i]);
 //       process.exit(-1);
    }
}
/*---------- read developer data and proceed -------------*/
fs.readFile(devDir+"hostname", (err, data) => {
    if (err) throw err;
    hostname=data;
    fs.readFile(devDir+"uid", (err, data) => {
        if (err) throw err;
        uid=data;

        var authData={
            pk: devDir+"private_key.pem",
            x509: devDir+"x509" ,
            generateKeys:false,
            makeCSR:false,
            devPath:devDir,
            CSRsubj:"C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN="+hostname
        }
/*----------- generate RSA key + csr and post to provision ---------*/
        test.setAuthData(authData,function(csr,pk){
                
                var postData={
                    email:"zglozman@beame.io"
                }
                var testParams={
                    version:"/v1",
                    postData:postData,
                    api:"/dev/profile/update",
                    answerExpected:false,
                    decode:false
                }
                test.runRestfulAPI(testParams,function(err,payload){
                    if(!err){
                        for(i=0;i<keys.length;i++){
                            if(payload[keys[i]]!=undefined){
                                console.log(keys[i] + ': ' + payload[keys[i]]);
            // next is single test use only,
            // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
            //                    fs.writeFile(devDir+keys[i],payload[keys[i]]);
                            }
                            else{
                                console.log('Error, missing <' + keys[i] + '> element in provisioning answer');
                                process.exit(-1);
                            }
                        }
                        console.log('Developer profile update: successful');
                        callback("success");
                    }
                    else{
                        console.log('Fail: '+err);
                        callback("Fail");
                    }
                });
        });
    });
});
}
