var test=require('./prov_api.js');
var fs=require('fs');
var keys = ["$id","hostname","uid"];    //expected answer keys
var devPath = "./.beame/";              //path to store dev data: uid, hostname, key, certs, appData

try{
    if(fs.lstatSync(devPath)){
        console.log("Directory for developer already exists");
    }
}
catch(e) { 
    console.log("Dev path ", devPath);
    fs.mkdirSync(devPath);
}

/* Expected answer (values gonna change):
 *  "$id": "1",
 *  "hostname": "lkdz51o29q1hlfmusixn3ryilfhm5vdi.v1.beameio.net",
 *  "uid": "96fc1f42-30ac-4829-bbcc-3f518fcefcb5"
 * 
 */

/*console.log(process.argv);
if (process.argv.length < 3) {
    console.log('Usage: node '+__filename+' nikname');
    process.exit(-1);
}*/

var param=process.argv[2];              //get name from cli
console.log('Running api with cli param: '+param);

var authData={
    pk:"./authData/pk.pem",
    x509:"./authData/x509.pem",
    generateKeys:false,
    makeCSR:false,
    CSRsubj:"/C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=doesntMatter"
};

var createDeveloperRequest = function(param, callback){
    
	postData={
        name:param
    };
    
	var testParams={
        version:"/v1",
        api:"/dev/create",
        postData:postData,
        answerExpected:true,
        decode:false
    };
    
	test.runRestfulAPI(testParams,function(err,payload){
        if(!err){
            var i;
            var devDir=devPath+payload.hostname+'/';
            if (!fs.existsSync(devDir)){
                fs.mkdirSync(devDir);//create directory for new developer, named with his unique hostname
            }
            for(i=0;i<keys.length;i++){
                if(payload[keys[i]] !== undefined){
                    console.log(keys[i] + ': ' + payload[keys[i]]);
					// next is single test use only,
					// eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                    fs.writeFile(devDir+keys[i],payload[keys[i]]);
                }
                else{
                    console.log('Error, missing <' + keys[i] + '> element in provisioning answer');
                    //process.exit(-1);
                    callback(null);
                }
            }
	    if(callback){
		callback(payload);
	    }
        }
        else{
            callback(null);
	    console.log('Fail: '+err);
	}

    });
};
 

module.exports.requestCreateDeveloper = function(developerName, callback){
	var devName = developerName;

	test.setAuthData(authData, function(csr, pk){
		
		createDeveloperRequest(developerName,callback);
		//callback will return null,null so
		//nothing special to do here, this is 
		//to use in further activities: update / getCert etc

	} );
};

	
//module.exports =  requestCreateDeveloper;

