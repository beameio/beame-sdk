//var test=require('../beame-provision-test/main.js');
var test=require('beame-provision-test');
var fs=require('fs');
var uid;//variable to hold UID
var host;//variable to hold hostname
var devPath = "./.beame/";              //path to store dev data: uid, hostname, key, certs, appData
var keys = ["x509","pkcs7","ca"];
/* Expected answer (values gonna change):
 *  "$id": "1",
 *    "hostname": "lkdz51o29q1hlfmusixn3ryilfhm5vdi.v1.beameio.net",
 *      "uid": "96fc1f42-30ac-4829-bbcc-3f518fcefcb5"
 * */

if (process.argv.length < 3) {
    console.log('Usage: node '+__filename+' unique-hostname');
    process.exit(-1);
}
var param=process.argv[2];
console.log('Running test with param: '+param);
/*---------- check if developer exists -------------------*/
var devDir=devPath+param+"/";
if (!fs.existsSync(devDir)){//provided invalid hostname
    console.log('Provided hostname is invalid, list ./.beame to see existing hostnames');
    process.exit(-1);
}
/*---------- read developer data and proceed -------------*/
fs.readFile(devDir+"hostname", (err, data) => {
    if (err) throw err;
    hostname=data;
    fs.readFile(devDir+"uid", (err, data) => {
        if (err) throw err;
        uid=data;


        var authData={
            pk:"./authData/pk.pem",
            x509:"./authData/x509.pem",
            generateKeys:true,
            makeCSR:true,
            devPath:devDir,//static path for now, need to generate with uid to allow multiuser tests
            CSRsubj:"C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN="+hostname
        }
/*----------- generate RSA key + csr and post to provision ---------*/
        test.setAuthData(authData,function(csr,pk){
            if(csr!=null){
                
                var postData={
                    csr:csr,
                    uid:uid
                }
                var testParams={
                    version:"/v1",
                    postData:postData,
                    api:"/dev/getCert",
                    answerExpected:true,
                    decode:false
                }
                test.runRestfulAPI(testParams,function(err,payload){
                    if(!err){
                        var i;
                        for(i=0;i<keys.length;i++){
                            if(payload[keys[i]]!=undefined){
                                console.log(keys[i] + ' => OK ');// + payload[keys[i]]);
            // next is single test use only,
            // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                                fs.writeFile(devDir+keys[i],payload[keys[i]]);
                            }
                            else{
                                console.log('Error, missing <' + keys[i] + '> element in provisioning answer');
                                process.exit(-1);
                            }
                        }
                        console.log('New dev cert request: successful');
                    }
                    else
                        console.log('Fail: '+err);
                });
            }
        });
    });
});


