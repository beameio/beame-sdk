'use strict';
var fs = require('fs');
var path = require('path');
var _=require('underscore');
var os = require('os');
var debug = require("debug")("collectauthdata");
require('./../utils/Globals');
var jmespath = require('jmespath');

var BeameDirServices = function(){

};


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
		startdir = global.devPath;
	}
    var subfolders = getDirectories(startdir);
  	var currentLevelData = {};

	if(start != true){
		currentLevelData = readCertData(startdir);
	}

	_.each(subfolders, function(dir) {
		debug('found subdir ' + startdir);
		var deeperLevel = readBeameDir(makepath(startdir, dir), false);
		if (start) {
			if(!currentLevelData[deeperLevel.metadata.level])
				currentLevelData[deeperLevel.metadata.level] = [];
			currentLevelData[deeperLevel.metadata.level].push(deeperLevel);
		}
		else {
			if(!currentLevelData[deeperLevel.metadata.level])
				currentLevelData[deeperLevel.metadata.level] = {};
			currentLevelData[deeperLevel.metadata.level][deeperLevel.metadata.hostname] = deeperLevel;
			//currentLevelData[deeperLevel.metadata.level][deeperLevel.metadata.hostname].push(deeperLevel);
		}
	});
	return currentLevelData;
}


BeameDirServices.prototype.scanBeameDir = function(startdir){
	return readBeameDir(startdir);
};

//var tree = readBeameDir("", true);
//console.log(jmespath.search(tree, "Developer[*]"));
//scanBeameDir(os.homedir()+'/.beame/');

module.exports = BeameDirServices;