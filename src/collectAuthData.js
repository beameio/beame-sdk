'use strict';
var fs = require('fs');
var path = require('path');
var dataCollection;
var jsonElement;
var _=require('underscore');
var os = require('os');
var usrFiles = ["uid","hostname","x509","ca","private_key.pem","pkcs7","name"];
var pathDepths=0;//0=~/.beame 1=developer 2=app 3=client
var beameDir;

//
//levels: developer, app instance
//
//
var levels = ['developer', 'app', 'instance'];



var getNextLevel = function(level){
	switch(level){
		case "developer":
			return "app";
		case "app":
			return "instance";
		case "instance":
			return -1;
		default:
			return -1;
	}
};

var keyPair = function(baseDir, sourceDir, level, allDone){
    console.log("Creating keypair constructor " + baseDir + " " +sourceDir + " " + level);
	try {
        this.credentials = {
            "name": fs.readFileSync(baseDir + sourceDir + "/name"),
            "key": fs.readFileSync(baseDir + sourceDir + "/private_key.pem"),
            "cert": fs.readFileSync(baseDir + sourceDir + "/x509"),
            "hostname": fs.readFileSync(baseDir + sourceDir + "/hostname")
        };
    } catch (e) { this.credentials = {}; }
	var nextLevel = getNextLevel(level);

	this.getDependantsSync(baseDir + sourceDir, nextLevel, _.bind(function(tree){
        console.log("Get Dependant synch returned " + JSON.stringify(tree));
        allDone && allDone(this.credentials.name, this.credentials);
    }, this));/*function(tree){


	
	});*/
};

function scanBeameDir(beameDir){
	console.log('start');
	if(beameDir.length === 0){
		beameDir = os.homedir() + "/.beame/";
	}
	var developers = [];
	fs.readdir(beameDir, _.bind(function(err, data){
		console.log('found developers: ' + data);
		_.each(data, function(item){
			var stat = fs.statSync(beameDir + item);
			console.log('scanBeameDir: '+item);
			if (stat && stat.isDirectory()) {
	 			var dataLogger = new keyPair(beameDir, item, levels[0],  function(name, tree){
                    developers[tree.name] = tree;
                    console.log(JSON.stringify(tree));
				});
			}
		});
	}), this);
}

keyPair.prototype.getDependantsSync = function(currentDir, level, done ){
    console.log("getDependantsSync " + currentDir + " " + level);
	fs.readdir(currentDir, _.bind(function(err, data){
		if (err) {  return done(err);	}
		_.each(data, _.bind(function(item){
			var stat = fs.statSync(currentDir +"/" + item);
			if (stat && stat.isDirectory()) {
                console.log("Creating keypair in getDependantsSync ")
				var newKeyPair = new keyPair(currentDir + "/",  item, level, function(name, tree) {
                    console.log("keyPair returned  " + tree);//+ currentDir + "/" + item + " LEvel " + level);
                    done(name, tree);
                });

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
                    {
                        console.log(level + " reader completed " + currentDir + "/",  item, level)
                        done && done("", this.credentials);
                    }
                }
			}
		}, this));
		
	}, this));
};

scanBeameDir(os.homedir()+'/.beame/');
