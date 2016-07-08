
'use strict';
var fs = require('fs');
var path = require('path');
var _=require('underscore');
var os = require('os');
var debug = require("debug")("collectauthdata");
require('./../utils/Globals');
var jmespath = require('jmespath');
var beameDirApi = require('./BeameDirServices');
var sprintf =require('sprintf');

// The idea is this object framework above BeameDirServices.js
// BeameStore will load the directory and manage it in memory as well be capabale proving high level
// API to work with JSON. 
//
//

function BeameStore(beamedir){
	if(!beamedir ||  beamedir.length === 0){
		beamedir = global.devPath;
	}

	this.beameStore = beameDirApi.readBeameDir(beamedir);
	
}

BeameStore.prototype.jsearch= function (searchItem, level){

	if(!searchItem){
		return new Error({"Status": "error", "Message":"searchDevelopers called with either name and fqdn"});
	}
	
	var queryString = "";

	switch(level) {
		case "developer":
		{
			queryString =  sprintf("[?(hostname=='%s' )|| (name =='%s' )].{name:name, hostname:hostname, level:level} ", searchItem, searchItem );
			break;
		}

		case "atom":
		{
			queryString = sprintf("[].atom[?(hostname=='%s') || (name=='%s')].{name:name, hostname:hostname, level:level}| []", searchItem, searchItem );
			break;
		};

		case "edgeClient":
		{
			queryString = sprintf("[].atom[].edgeclient[?(hostname=='%s')].{name:name, hostname:hostname, level:level} | []", searchItem, searchItem );
			break;
		};
		default:
		{
			new Error("Invalid level passed to search ", level);
		}
	}
	debug("Query string " + queryString );
	var objects = jmespath.search(this.beameStore, queryString );
	return objects;
};

BeameStore.prototype.searchDevelopers = function(name) {
	var names = this.jsearch(name, "developer");
	var returnDict = [];

	_.each(names, _.bind(function (item) {
		var qString = sprintf("[?hostname == '%s'] | []", item.hostname);
		returnDict= returnDict.concat(jmespath.search(this.beameStore, qString));
	}, this));
	return returnDict;
};

BeameStore.prototype.searchAtoms = function(name){
	var names = this.jsearch(name, "atom");
	var returnDict = [];

	_.each(names, _.bind(function (item) {
		var qString = sprintf("[].atom[?hostname == '%s'] | []", item.hostname);
		returnDict= returnDict.concat(jmespath.search(this.beameStore, qString));
	}, this));
	return returnDict;
};

BeameStore.prototype.searchEdge =  function(name){
	var names = this.jsearch(name, "edgeClient");
	var returnDict = [];

	_.each(names, _.bind(function (item) {
		var qString = sprintf("[].atom[].edgeclient[?hostname == '%s'] | []", item.hostname);
		returnDict= returnDict.concat(jmespath.search(this.beameStore, qString));
	}, this));
	return returnDict;
};


BeameStore.prototype.listCurrentDevelopers = function() {
	return jmespath.search(this.beameStore, "[*].{name:name, hostname:hostname, level:level} | []");
}

BeameStore.prototype.listCurrentAtoms = function(){
	return jmespath.search(this.beameStore, "[*].atom[*].{name:name, hostname:hostname, level:level} | []");
}

BeameStore.prototype.listCurrentInstances = function(){
 	return jmespath.search(this.beameStore, "[].atom[].edgeclient[*].{name:name, hostname:hostname, level:level} | []");
}

module.exports = BeameStore;
