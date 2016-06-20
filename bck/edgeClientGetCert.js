var test=require('../beame-provision-test/main.js');
//var test=require('beame-provision-test');
var fs=require('fs');
var uid;//variable to hold UID
var host;//variable to hold hostname
var devPath = "./.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var edgeEndpointURL="http://lb-dev.luckyqr.io/endpoint"; //URL to get edge server data
var keys = ["x509","pkcs7","ca"];//data that should be returned by the operation
/*-------- files to check to ensure call on available layer ------------*/
var usrFiles = ["uid","hostname","x509","ca","private_key.pem","pkcs7"];
var appFiles = ["uid","hostname","x509","ca","private_key.pem","pkcs7"];
var edgeFiles = ["uid","hostname"];
/*-------- process arguments --------------------*/
if (process.argv.length < 5){ 
    console.log('Usage: node '+__filename+' dev-hostname app-hostname edge-client-hostname');
    process.exit(-1);
}
var param=process.argv[2];
var appHostName=process.argv[3];
var edgeHostName=process.argv[4];
console.log('Running test with param: '+param);
/*---------- check if developer/app/edgeClient exist -------------------*/
var devDir=devPath+param+"/";
var devAppDir=devDir+appHostName+"/";
var edgeClientDir=devAppDir+edgeHostName + "/";
var i;
for(i=0;i<usrFiles.length;i++){
    if(!fs.existsSync(devDir+usrFiles[i])){
        console.log('Error! missing: '+devDir+usrFiles[i]);
        process.exit(-1);
    }
}
for(i=0;i<appFiles.length;i++){
    if(!fs.existsSync(devAppDir+usrFiles[i])){
        console.log('Error! missing: '+devAppDir+usrFiles[i]);
        process.exit(-1);
    }
}
for(i=0;i<edgeFiles.length;i++){
    if(!fs.existsSync(edgeClientDir+usrFiles[i])){
        console.log('Error! missing: '+edgeClientDir+usrFiles[i]);
        process.exit(-1);
    }
}
/*---------- read access level data and proceed -------------*/
fs.readFile(edgeClientDir+"hostname", (err, data) => {
    if (err) throw err;
    hostname=data;
    fs.readFile(edgeClientDir+"uid", (err, data) => {
        if (err) throw err;
        uid=data;

        var authData={
            pk: devAppDir+"private_key.pem",
            x509: devAppDir+"x509" ,
            generateKeys:true,
            makeCSR:true,
            devPath:edgeClientDir,
            CSRsubj:"C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN="+hostname
        }
/*----------- generate RSA key + csr and post to provision ---------*/
        test.setAuthData(authData,function(csr,pk){
//            test.getEndpoint(edgeEndpointURL,function(err, endpointData){
                if(authData.makeCSR && csr==null){
                    console.log('CSR creation for app failed');
                    process.exit(-1);
                }
                var postData={
                    csr:csr,
                    uid:uid
                }
                var testParams={
                    version:"/v1",
                    postData:postData,
                    api:"/client/getCert",
                    answerExpected:true
                }
                test.runRestfulAPI(testParams,function(err,payload){
                    if(!err){
                        var nextLevelDir=edgeClientDir;//devAppDir+payload.hostname+'/';
                        if (!fs.existsSync(nextLevelDir)){
                            fs.mkdirSync(nextLevelDir);//create directory if not exists 
                        }
                        for(i=0;i<keys.length;i++){
                            if(payload[keys[i]]!=undefined){
                                console.log(keys[i] + ': ' + payload[keys[i]]);
            // next is single test use only,
            // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                fs.writeFile(nextLevelDir+keys[i],payload[keys[i]]);
                            }
                            else{
                                console.log('Error, missing <' + keys[i] + '> element in provisioning answer');
                                process.exit(-1);
                            }
                        }
                        console.log('Getting edge client certs: successful');
                    }
                    else
                        console.log('Fail: '+err);
                });
//            });
        });
    });
});


