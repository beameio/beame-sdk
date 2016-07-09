var BeameStore = require("../../src/services/BeameStore");
var BeameDirectApi = require("../../src/services/BeameDirServices");
var jmespath = require('jmespath');
var tree = BeameDirectApi.readBeameDir();
var debug =require("debug")("TestBeameStore");
var _ = require("underscore");

var store = new BeameStore();

var currentDevelopers = store.listCurrentDevelopers();
var currentAtoms = store.listCurrentAtoms();
var currentInstances = store.listCurrentInstances();

function testBeameStruct(beameStruct, keyword, func, useNameSearch){
	console.log("****************Listing " + keyword + " started *************");
	_.each(beameStruct, function(item){
		var name = useNameSearch? item.name : item.hostname
		var beameRecord =  func.call(store, name);
		console.log("Testing:", name);
		if(!beameRecord || beameRecord.length === 0 || beameRecord.length != 1){
			throw new Error(["Developers listing failered", name ,  beameRecord]);
		}
	});
	console.log("****************Listing" + keyword + " started *************");
	return 0;
}

testBeameStruct(currentDevelopers, "developers", _.bind(store.searchDevelopers,store), true);
testBeameStruct(currentDevelopers, "developers", _.bind(store.searchDevelopers,store) , false);
	
testBeameStruct(currentAtoms, "currentAtoms",         _.bind(store.searchAtoms, store) , true);
testBeameStruct(currentAtoms, "currentAtoms",         _.bind(store.searchAtoms, store), false);
testBeameStruct(currentInstances, "currentInstances", _.bind(store.searchEdge, store), false);
//console.log((tree, "[].atom[] | [].edgeclient[]"));
