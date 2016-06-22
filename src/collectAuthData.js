'use strict';
var fs = require('fs');
var path = require('path');
var dataCollection;
var jsonElement;
var _=require('underscore');
var os = require('os');
var usrFiles = ["uid","hostname","x509","ca","private_key.pem","pkcs7","name"];
var pathDepths=0;//0=~/.beame 1=developer 2=app 3=client

//
//levels: developer, app instance
//
//
var levels = ['developer', 'app', 'developer'];



var getNextLevel = function(level){
	switch(level){
		case "developer":
			return 0 + 1;
		case "app":
			return 1 + 1;
		case "instance":
			return -1;
		default:
			return -1;
	}
};

var keyPair = function(sourceDir, level, allDone){
	this.credentials = {
		"name":fs.readFileSync(sourceDir + "name"),
		"key": fs.readFileSync(sourceDir + "private_key.pem"),
		"cert": fs.readFileSync(sourceDir + "x509"),
		"hostname": fs.readFileSync(sourceDir + "hostname")
	};
	var nextLevel = getNextLevel(level);

	dataLogger.getDependantsSync(sourceDir, nextLevel, allDone);/*function(tree){

		allDone && allDone(this.credentials.name, this.credentials);
	
	});*/
};

function scanBeameDir(beameDir){
	console.log('start');
	if(beameDir.length === 0){
		beameDir = os.homedir() + "/.beame/";
	}
	var developers = [];
	fs.readdirSync(beameDir, _.bind(function(err, data){
		console.log('data'+data);	
		_.each(data, function(item){
			var stat = fs.statSync(item);
			console.log('scanBeameDir: '+item);
			if (stat && stat.isDirectory()) {
				var dataLogger = new keyPair(item, levels[0],  function(tree){ 
					console.log(JSON.stringify(tree));
				});
			}
		});
	}), this);
}

keyPair.prototype.getDependantsSync = function(currentDir, level, done ){
	fs.readdirSync(currentDir, _.bind(function(err, data){
		if (err) {  return done(err);	}
		_.each(data, _.bind(function(item){
			var stat = fs.statSync(item);
			if (stat && stat.isDirectory()) {
				var newKeyPair = new keyPair(item, level);

				switch(level){
					case "developer":
					
						if(!this.credentials.apps)
						{
							this.credentials.apps = [];
						}
				
						this.credentials.apps.push(newKeyPair.credentials);
					break;
					case "app":
						if(!this.credentials.instances)
						{
							this.credentials.instances = [];
						}
				
						this.credentials.instances.push(newKeyPair.credentials);
					break;
					default:
						done(this.credentials);
				}
			}
		}), this);
		
	}, this));
};

scanBeameDir(os.homedir()+'/.beame/');
