'use strict';
var fs       = require('fs');
var path     = require('path');
var _        = require('underscore');
var debug    = require("debug")("beamedirservices");
var config   = require('../../config/Config');
const module_name = config.AppModules.BeameDirServices;
var logger        = new (require('../utils/Logger'))(module_name);
var jmespath = require('jmespath');


function makepath() {
	var args = Array.prototype.slice.call(arguments);
	return path.join.apply(this, args);
}

function readCertData(basedir) {
	var credentials = {};

	_.map(config.CertFileNames, function (key, value) {
		try {
			credentials[value] = fs.readFileSync(makepath(basedir, key));
		}
		catch (e) {
			logger.fatal("readCertData Error", e);
		}
	});
	credentials['path'] = basedir;
	try {
		var fileContent = fs.readFileSync(makepath(basedir, config.metadataFileName));
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		_.map(JSON.parse(fileContent), function (key, value) {
			credentials[value] = key;
		});
	} catch (e) {
	    logger.fatal("readCertData Error", e);
	}
	return credentials;
}


function getDirectories(srcpath) {
	return fs.readdirSync(srcpath).filter(function (file) {
		return fs.statSync(path.join(srcpath, file)).isDirectory();
	});
}

function getFiles(srcpath) {
	return fs.readdirSync(srcpath).filter(function (file) {
		return fs.statSync(path.join(srcpath, file)).isFile();
	});
}

function getCertsFiles(srcpath) {
	return getFiles(srcpath).filter(f => f != config.metadataFileName);
}

function scanDigestDir(startPath) {
	var files        = fs.readdirSync(startPath);
	var listToDigest = {};

	_.each(files, function (file) {
		if (fs.statSync(path.join(startPath, file)).isDirectory()) {
			listToDigest[file] = scanDigestDir(path.join(startPath, file));
		} else {
			listToDigest[file] = fs.statSync(path.join(startPath, file));
		}
	});
	return listToDigest;
}


function readSubDevDir(devDir) {
	var subfolders    = getDirectories(devDir);
	var currentObject = readCertData(devDir);

	_.each(subfolders, function (dir) {
		var deeperLevel = readSubDevDir(makepath(devDir, dir), false);
		if (!currentObject[deeperLevel.level]) {
			currentObject[deeperLevel.level] = [];
		}
		currentObject[deeperLevel.level].push(deeperLevel);
	});
	return currentObject;
}

function generateDigest(startPath) {
	//noinspection ES6ModulesDependencies,NodeModulesDependencies
	var data = JSON.stringify(scanDigestDir(startPath));
	return require('crypto').createHash('sha224').update(data).digest("hex");
}

function readBeameDir(startdir) {
	debug("starting with " + startdir);
	var developers = [];
	if (!startdir) {
		startdir = config.rootDir;
	}

	var subfolders = getDirectories(startdir);
	_.each(subfolders, function (dir) {
		var developer = readSubDevDir(makepath(startdir, dir));
		developers.push(developer);
	});
	return developers;
}

module.exports = {
	generateDigest,
	getFiles,
	getCertsFiles,
	makepath,
	readBeameDir
};
