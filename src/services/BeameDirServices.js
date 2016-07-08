'use strict';
var fs = require('fs');
var path = require('path');
var _=require('underscore');
var os = require('os');
var debug = require("debug")("collectauthdata");
require('./../utils/Globals');
var jmespath = require('jmespath');


function makepath(){
	var args = Array.prototype.slice.call(arguments);
	return path.join.apply(this, args);
}

function readCertData(basedir){
	try {
		var credentials = {};
		_.map(global.CertFileNames, function(key, value){
			credentials[value] = fs.readFileSync(makepath(basedir  , key));
			_.map(JSON.parse(fs.readFileSync(makepath(basedir , "metadata.json"))), function (key, value){
				credentials[value] = key;
			});
		});
		return credentials;
    } catch (e) {
        debug("Error", e.toString());
		console.error("Directory reading failed ", e);
        return {};
    }
}

function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
}

function readSubDevDir(devDir) {
	var subfolders = getDirectories(devDir);
	var currentObject = readCertData(devDir);

	_.each(subfolders, function (dir) {
		var deeperLevel = readSubDevDir(makepath(devDir, dir), false);
		if(!currentObject[deeperLevel.level]){
			currentObject[deeperLevel.level]=[];
		}
		currentObject[deeperLevel.level].push(deeperLevel);
	});
	return currentObject;
}

function readBeameDir(startdir) {
	debug("starting with " + startdir);
	var developers = [];
	if(!startdir ||  startdir.length === 0){
		startdir = global.devPath;
	}
	var subfolders = getDirectories(startdir);
	_.each(subfolders, function(dir) {
		var deverlopr = readSubDevDir(makepath(startdir, dir));
		developers.push(deverlopr );
	});
	return developers;
}

module.exports =  {"readBeameDir": readBeameDir };
