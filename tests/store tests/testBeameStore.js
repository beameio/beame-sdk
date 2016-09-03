const BeameStore = require("../../src/services/BeameStoreV2");
const debug =require("debug")("TestBeameStore");

const store = new BeameStore();


/*
function testBeameStruct(beameStruct, keyword, func, useNameSearch){
	console.log("****************Listing " + keyword + " started *************");
	_.each(beameStruct, function(item){
		var name = useNameSearch? item.name : item.hostname;
		var beameRecord =  func.call(store, name);


		if(!beameRecord || beameRecord.length === 0 || (beameRecord.length != 1 && useNameSearch == false)){
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



console.log("Total number of credentials is " + store.search());

var fullCredentials = [];
fullCredentials  = fullCredentials.concat(store.search("developer"), store.search("atom"), store.search("edgeclient"));

store.search("developer", currentDevelopers[0].hostname);
store.search("atom", currentDevelopers[0].hostname);
store.search("edgeclient", currentDevelopers[0].hostname);

store.search("", currentDevelopers[0].hostname);


store.searchItemAndParentFolderPath('bmvaow3ewjji3vfy.v1.beameio.net');
store.searchItemAndParentFolderPath('w9tlixkmx5exsesm.vbo7y31f7o98qwpe.v1.beameio.net');
store.searchItemAndParentFolderPath('ri5vmbuj8ezu79k8.v1.r.d.edge.eu-central-1a-1.v1.beameio.net');
*/

//
// check searching by hostname
//





console.log(fullCredentials);

//console.log((tree, "[].atom[] | [].edgeclient[]"));
