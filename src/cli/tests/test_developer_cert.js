/**
 * Created by zenit1 on 08/07/2016.
 */
var _ = require('underscore');
var argv = require('minimist')(process.argv.slice(2));
var developerServices = new(require('../../src/core/DeveloperServices'))();


var getCert = function(){
    //console.log(argv);
    
    var host = argv['host'];
    
    if(_.isEmpty(host)){
        console.error('Host required');
        process.exit(1);
    }
    
    var uid = argv['uid'];
    
    if(_.isEmpty(uid)){
        console.error('Uid required');
        process.exit(1);
    }
    console.log('input validated');
    
    developerServices.completeDeveloperRegistration(host,uid,function(error,payload){
        if(!error){
            console.log('/**-------------Success----------------**/',payload);
            process.exit(0);
        }
        else{
            console.error(error);
            process.exit(1);
        }
    });
    
};


getCert();