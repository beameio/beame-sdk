
var beameApi = require("../index.js");

var events = require('events');
var eventEmitter = new events.EventEmitter();
var fs = require('fs');
var runDataFile = './runData.json';
var debug = require("debug")("BeameApiTests");

if(process.argv.length >= 3){
	if(fs.existsSync(process.argv[2]))
		runDataFile = process.argv[2];
}

/*
var runningParam={
	devName:"sas",
	devHostname:"empty",
	devUid:"empty",
	appHostname:"empty",
	appUid:"empty"
	appName:"myApp"
	edgeHostname:"empty",
	edgeUid:"empty"
};*/

try{
	 var runningParam = require(runDataFile);
}
catch(e){
	console.log('No run configuration file <'+runDataFile+'>, running default sequence');
	var runningParam = {
		'test1':'devCreate',
		'test2':'devGetCert',
		'test3':'devProfileUpdate',
		'test4':'devAppSave',
		'test5':'devAppGetCert',
		'test6':'edgeClientRegister',
		'test7':'edgeClientGetCert',
		'test8':'devAppUpdate',
		'test9':'exit',
		'devName':"sas",
		'devHostname':"empty",
		'devUid':"empty",
		'appHostname':"empty",
		'appUid':"empty",
		'appName':"myApp",
		'edgeHostname':"empty",
		'edgeUid':"empty"
	};
}


var testN = 0;
eventEmitter.on('switch',function(){
	switch(++testN){
		case 1:
			eventEmitter.emit(runningParam.test1);
			break;
		case 2:
			eventEmitter.emit(runningParam.test2);
			break;
		case 3:
			eventEmitter.emit(runningParam.test3);
			break;
		case 4:
			eventEmitter.emit(runningParam.test4);
			break;
		case 5:
			eventEmitter.emit(runningParam.test5);
			break;
		case 6:
			eventEmitter.emit(runningParam.test6);
			break;
		case 7:
			eventEmitter.emit(runningParam.test7);
			break;
		case 8:
			eventEmitter.emit(runningParam.test8);
			break;
		default:
			console.warn('undefined sequence');
			process.exit(0);
	}
});

eventEmitter.on('devCreate', function(){
	console.log('{\"devCreate\":\"running\"}');
	
	beameApi.devCreate.requestCreateDeveloper(runningParam.devName,function(payload){
		if(payload == null){
			console.log('{\"devCreate\":\"failed\"}');
		}
		else{
			console.log('{\"devGetCert\":\"passed\"}');
			runningParam.devHostname = payload.hostname;
			runningParam.devUid = payload.uid;
		}
		eventEmitter.emit('switch');
	});
});

eventEmitter.on('devGetCert', function(){
	console.log('{\"devGetCert\":\"running\"}');
	beameApi.devGetCert.getDevCert(runningParam.devHostname,function(payload){
		if(payload === null){
			console.log('{\"devGetCert\":\"failed\"}');
		}
		else{
			console.log('{\"devGetCert\":\"passed\"}');
		}
		eventEmitter.emit('switch');
	});
});

eventEmitter.on('devProfileUpdate', function(){
	console.log('{\"devProfileUpdate\":\"running\"}');
	beameApi.devProfileUpdate.devProfileUpdate(runningParam.devHostname,function(payload){
		if(payload === null){
			console.log('{\"devProfileUpdate\":\"failed\"}');
		}
		else{
			console.log('{\"devProfileUpdate\":\"passed\"}');
		}
		eventEmitter.emit('switch');
	});
});

eventEmitter.on('exit', function(){
	console.warn('test sequence complete');
	process.exit(0);
});

eventEmitter.on('devAppSave', function(){
	console.log('{\"devAppSave\":\"running\"}');
	beameApi.devAppSave.devAppSave(runningParam.devHostname,runningParam.appName,function(payload){
		if(payload === null){
			console.log('{\"devAppSave\":\"failed\"}');
		}
		else{
			console.log('{\"devAppSave\":\"passed\"}');
			runningParam.appHostname = payload.hostname;
			runningParam.appUid = payload.uid;
			eventEmitter.emit('switch');
		}
	});
});

eventEmitter.on('devAppGetCert', function(){
	console.log('{\"devAppGetCert\":\"running\"}');
	beameApi.devAppGetCert.devAppGetCert(runningParam.devHostname,runningParam.appHostname,function(payload){
		if(payload === null){
			console.log('{\"devAppGetCert\":\"failed\"}');
		}
		else{
			console.log('{\"devAppGetCert\":\"passed\"}');
			eventEmitter.emit('switch');
		}
	});
});

eventEmitter.on('edgeClientRegister', function(){
	console.log('{\"edgeClientRegister\":\"running\"}');
	beameApi.edgeClientRegister.edgeClientRegister(runningParam.devHostname,runningParam.appHostname,function(payload){
//		  console.log('test output:: '+payload);
		if(payload === null){
			console.log('{\"edgeClientRegister\":\"failed\"}');
		}
		else{
			console.log('{\"edgeClientRegister\":\"passed\"}');
			runningParam.edgeHostname = payload.hostname;
			runningParam.edgeUid = payload.uid;
			eventEmitter.emit('switch');
		}
	});
});

eventEmitter.on('edgeClientGetCert', function(){
	console.log('{\"edgeClientGetCert\":\"running\"}');
	beameApi.edgeClientGetCert.edgeClientGetCert(runningParam.devHostname,runningParam.appHostname,runningParam.edgeHostname,function(payload){
		if(payload === null){
			console.log('{\"edgeClientGetCert\":\"failed\"}');
		}
		else{
			console.log('{\"edgeClientGetCert\":\"passed\"}');
		}
		eventEmitter.emit('switch');
	});
});

eventEmitter.emit('switch');

