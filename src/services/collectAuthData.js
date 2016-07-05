'use strict';
var fs = require('fs');
var path = require('path'); 
var _=require('underscore');
var os = require('os'); 
var debug = require("debug")("collectauthdata");
require('./../utils/Globals');


var beameDir = "";


function makepath(){
	var args = Array.prototype.slice.call(arguments);
	return path.join.apply(this, args);
}

function readCertData(basedir){
	try {
		var credentials = {};
		_.map(global.CertFileNames, function(key, value){
			credentials[value] = fs.readFileSync(makepath(basedir  , key));
			credentials.metadata = JSON.parse(fs.readFileSync(makepath(basedir , "metadata.json")));
		});
		return credentials;
    } catch (e) {
        debug("Error", e.toString());
        return {
            "name":"",
            "key":"",
            "cert":"",
            "hostname":""
        };
    }
}

function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
}

function readBeameDir(startdir, start){
	debug("starting with " + startdir);
	if(!startdir ||  startdir.length == 0){
		startdir = makepath(os.homedir(), "/.beame/");
	}
    var subfolders = getDirectories(startdir);
  	var currentLevelData = {};

	if(start != true){
		currentLevelData = readCertData(startdir);
	}

	_.each(subfolders, function(dir) {
		debug('found subdir ');
//		_.each(getDirectories(makepath(startdir, dir)), function(dirs){
		var deeperLevel = readBeameDir(makepath(startdir, dir), false);
		if (start) {
			if(!currentLevelData[deeperLevel.metadata.level])
				currentLevelData[deeperLevel.metadata.level] = [];
			currentLevelData[deeperLevel.metadata.level].push(deeperLevel);
			//currentLevelData[deeperLevel.metadata.hostname].push(deeperLevel);;
			//currentLevelData[]
		}
		else {
			if(!currentLevelData[deeperLevel.metadata.level])
				currentLevelData[deeperLevel.metadata.level] = {};
			currentLevelData[deeperLevel.metadata.level][deeperLevel.metadata.hostname] = deeperLevel;
			//currentLevelData[deeperLevel.metadata.level][deeperLevel.metadata.hostname].push(deeperLevel);
			//	currentLevelData.next = deeperLevel;
			//}
			//return beameDir;
		}
//		});
	});
	return currentLevelData;
};

var tree = readBeameDir("", true);
console.log(JSON.stringify(tree, "", 2));
//scanBeameDir(os.homedir()+'/.beame/');
