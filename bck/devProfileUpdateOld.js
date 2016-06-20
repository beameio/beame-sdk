var test=require('../beame-provision-test/main.js');
//var test=require('beame-provision-test');
var fs=require('fs');
var test_sequence=0;
var _=require('underscore');
var MAX_TESTS=1;
var keys = ["updateStatus"];//no answer expected

if (process.argv.length < 3) {
    console.log('Usage: node '+__filename+' email name(optional)');
    process.exit(-1);
}
var param1=process.argv[2];
var param2=process.argv[3];
console.log('Running test with param: '+param1+' '+param2);

var authData={
    pk:"./authData/pk.pem",
    x509:"./authData/x509.pem",
    generateKeys:false,
    makeCSR:false,
    CSRsubj:"C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=example.com"
}
test.setAuthData(authData,function(authDataOut,err){
    //nothing to do here, this is to use in further activitie: update / getCert etc
});

test.setAuthData("./authData/pk.pem","./authData/x509.pem");
var postData={
    email:param1
}
if(param2!=undefined)_.extend(postData,{name:param2});
var testParams={
    version:"/v1",
    postData:postData,
    api:"/dev/profile/update",
    answerExpected:false,
    decode:false
}
    //test.runRestfulAPI("/v1",postData,"/dev/profile/update",false,function(err,payload){
    test.runRestfulAPI(testParams,function(err,payload){
        if(!err){
            var i;
            for(i=0;i<keys.length;i++){
                if(payload[keys[i]]!=undefined){
                    console.log(keys[i] + ': ' + payload[keys[i]]);
// next is single test use only,
// eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                    fs.writeFile("./users/"+keys[i],payload[keys[i]]);
                }
                else{
                    console.log('Error, missing <' + keys[i] + '> element in provisioning answer');
                    process.exit(-1);
                }
            }
            console.log('profile updated');
        }
        else
            console.log('Fail: '+err);
    });


