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

    wd = 7;//reset watchdog

	try {
        this.credentials = {
            "name": fs.readFileSync(baseDir + sourceDir + "/name"),
            "key": fs.readFileSync(baseDir + sourceDir + "/private_key.pem"),
            "cert": fs.readFileSync(baseDir + sourceDir + "/x509"),
            "hostname": fs.readFileSync(baseDir + sourceDir + "/hostname")
        };
    } catch (e) {
        this.credentials = {

            "name":"",
            "key":"",
            "cert":"",
            "hostname":"",
        };
    }
/*    if(level === 'developer') {
        this.credentials.apps = [];
    }
    if(this.level === 'app') {
        this.credentials.instances = [];
    }*/
    this.level = level;

	this.getDependantsSync(baseDir + sourceDir, _.bind(function(name, tree){
        console.log("Get Dependant synch returned " + this.level);// +" " +  JSON.stringify(tree));
        allDone && allDone(this.credentials.name, tree);
    }, this));/*function(tree){


	
	});*/
};

function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
}
var wd = 7;
module.exports.scanBeameDir=function(beameDir,cb){
	console.log('start');
	if(beameDir.length === 0){
		beameDir = os.homedir() + "/.beame/";
	}
	var developers = [];
    var devDir = getDirectories(beameDir);
    var i_dev = 0, processed = 0;
    var returned = 0;
    fs.readdir(beameDir, _.bind(function(err, data){
        console.log('found developers: <<'+devDir.length +'>>'+ data);
        _.each(data, function(item){
            var stat = fs.statSync(beameDir + item);
            console.log('scanBeameDir: '+item);
            if (stat && stat.isDirectory()) {
                var dataLogger = new keyPair(beameDir, item, levels[0],  function(name, tree){
                    developers.push({dev:i_dev++, chain: tree});
                    //    console.log('Output:: '+JSON.stringify(developers));
                    //                    if(/*++i_dev >= devDir.length-1 &&*/ !returned){


                    //                        returned = 1;
                    //                  }
                });
            }
        });
        var exportData = setInterval(function(){
            if(!(wd--)){
                clearInterval(exportData);
                console.log('Exporting data :)');
                cb(developers);
            }
        },10);
    }), this);


}

keyPair.prototype.getDependantsSync = function(currentDir,  done ){
    console.log("getDependantsSync " + currentDir + " " + this.level);
	fs.readdir(currentDir, _.bind(function(err, data){
		if (err) {  return done("",err);	}
		_.each(data, _.bind(function(item){
			var stat = fs.statSync(currentDir +"/" + item);
			if (stat && stat.isDirectory()) {
                console.log("Creating keypair in getDependantsSync " + this.level);
				var newKeyPair = new keyPair(currentDir + "/",  item, getNextLevel(this.level), _.bind(function(name, tree) {
                    console.log("keyPair returned  " + tree);//+ currentDir + "/" + item + " LEvel " + this.level);
                    if(this.level === 'app'){
                        if(!this.credentials.instances)
                            this.credentials.instances =[];
                        this.credentials.instances.push(tree);
                        console.log('PUSHING INSTANCES');
                    }
                    if(this.level === 'developer'){
                        console.log('PUSHING APPS');
                        if(!this.credentials.apps)
                            this.credentials.apps =[];
                        this.credentials.apps.push(tree);
                    }
                    done(this.level , this.credentials);
                }, this));

			}
		}, this));
        if(this.level === "instance"){
            console.log(this.level + " reader completed " + currentDir + "/",   this.level)
            done && done(this.name , this.credentials);
        }

		
	}, this));
};

//scanBeameDir(os.homedir()+'/.beame/');
