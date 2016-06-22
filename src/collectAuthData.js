var fs = require('fs');
var dataCollection;
var jsonElement;
var os = require('os');
var usrFiles = ["uid","hostname","x509","ca","private_key.pem","pkcs7","name"];
var pathDepths=0;//0=~/.beame 1=developer 2=app 3=client
module.exports.authDataCollection = function(inPath, callback){
    var devPath = os.homedir()+"/.beame/";//replace with inPath
    var i_dev, i_app, i_client;

    var q = "\"";
    var qs= "\":\"";
    var qc="\",";
    var getAuthData = function(dirPath, key){
        var ret="";
        var str = "";
        str = fs.readFileSync(dirPath + "hostname");
        ret += q+key[0]+qs+str+qc;
        str = fs.readFileSync(dirPath + "x509");
        ret += q+key[1]+qs+str+qc;
        str = fs.readFileSync(dirPath + "private_key.pem");
        ret += q+key[2]+qs+str+qc;
        return ret;
    }


    fs.readFile(devPath + 'developers',function(err,data){
        if(!err){
            dataCollection += "[";//initialize top level of json array
     /* -------- loop through developers -----------*/
            var developers = data.toString().split('\r\n'); 
            for(i_dev=0;i_dev<developers.length;){
               if(developers[i_dev].length < 25){
                   i_dev++;
                   continue;
               } 
                
                var devIsOk = true;
                var devDir = devPath + developers[i_dev] + "/";
     /* -------- verify developer -----------------*/
               console.log('Reading developer: '+devDir); 
               for(i=0;i<usrFiles.length;i++){
                    if(!fs.existsSync(devDir+usrFiles[i])){
                        console.log('Error! missing: '+devDir+usrFiles[i]);
                        //developer not properly defined
                        devIsOk = false;
                    }
                }

                if(devIsOk){
                    var devName = fs.readFileSync(devDir + "name");
                    dataCollection += "{\"devname\":\""  + devName+qc;
                    dataCollection += "{"+getAuthData(devDir, ["hostname","devCert","devKey"]);
                    fs.readFile(devDir + 'apps',function(err,data){
                        if(!err){
                            dataCollection += "\"apps\":[";//initialize app level in json array
     /* -------- loop through apps -----------------*/
                            var apps = data.toString().split('\r\n');
                            for(i_app=0;i_app<apps.length;){

     /* -------- verify app -----------------------*/
                                if(apps[i_app].length < 25){
                                    i_app++;
                                    continue;
                                }
                                var appDir = devDir + apps[i_app]+"/";
                                console.log('reading auth data for app::'+appDir);
                                var appIsOk = true;

                                for(i=0;i<usrFiles.length;i++){
                                    if(!fs.existsSync(appDir+usrFiles[i])){
                                        console.log('Error! missing: '+appDir+usrFiles[i]);
                        //app is not properly defined
                                        appIsOk = false;
                                    }
                                }
                                if(appIsOk){
                                    var appName = fs.readFileSync(appDir + "name");
                                    dataCollection += "{\"appname\":\""  + appName+qc;
                                    dataCollection += getAuthData(appDir, ["hostname","appCert","appKey"]);

                                    fs.readFile(appDir+'edgeClients', function(err,data){
                                        if(!err){
                                            dataCollection += "\"instances\":[";//initialize hosts level in json array
                                        
                        /* -------- loop through clients -----------------*/
                                            var clients = data.toString().split('\r\n');
                                            for(i_client=0;i_client<clients.length;){

                        /* -------- verify client -----------------------*/
                                                if(clients[i_client].length < 25){
                                                    i_client++;
                                                    continue;
                                                }
                                                var clientDir = appDir + clients[i_client] + "/";
                                                var clientIsOk = true;
                                    console.log('reading auth data for instance::'+appDir);
                                                for(i=0;i<usrFiles.length - 1;i++){//- "name"
                                                    if(!fs.existsSync(clientDir+usrFiles[i])){
                                                        console.log('Error! missing: '+clientDir+usrFiles[i]);
                                    //app is not properly defined
                                                        clientIsOk = false;
                                                    }
                                                }
                                                if(clientIsOk){
                                                    dataCollection += "{"+getAuthData(clientDir, ["hostname","cert","key"]);
                                                }
                                                else{
                                                    dataCollection += "{";//empty instance
                                                }
                                                if(++i_client<clients.length){
                                                    dataCollection += "},";
                                                }
                                                else{
                                                    dataCollection += "}";
                                                }
                                            }//loop thru clients
                                        }
                                    });
                                }//if app is ok
                                else{
                                    console.log('app in NOK');
                                    dataCollection += "{}"; 
                                }
            /* ----------- close apps element ---------------------*/
                                if(++i_app < apps.length){
                                    dataCollection += "},";
                                }
                                else{
                                    dataCollection += "}";
                                }
                            }//loop thru apps
                            dataCollection += "]";//close app array
                        }//if apps file exists in developer
                        else{
                            dataCollection += "\"apps\":\"\"";//no apps defined for developer
                        }
                    });
                }
                else{
                    console.log('developer is NOK');
                }

            /* ----------- close developers element ---------------*/
                if(++i_dev < developers.length){
                    dataCollection += "},";
                }
                else{
                    dataCollection += "}";
                }
            }//loop thru developers
            dataCollection+="]";//close developers array
        }
        else{
            console.log('no developers in:' + devPath);
            dataCollection+="{}";//no developers defiled!
        }
        callback(dataCollection);
    });
}
