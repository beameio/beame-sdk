var EventEmitter = require( "events" ).EventEmitter;
var testScheduler= new EventEmitter();
var test=require('beame-provision-test');
var test_sequence=0;
var MAX_TESTS=1;




while(test_sequence<MAX_TESTS){
switch(test_sequence){
    case 0:
    test.devCreate("/v1","az","",function(err,payload){
        if(!err)
            console.log('Success:'+payload);
        else
            console.log('Fail: '+err);
    });
    ++test_sequence;
    break;
    case 
}
}
