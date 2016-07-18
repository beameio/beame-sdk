"use strict";

function test1(name, gender, huj){
	console.log("In test1 function", arguments);
}

function start(){
	var rl = require('readline');
	
	var i = rl.createInterface(process.sdtin, process.stdout);
//	i.write("To initiate the beame-sdk, please go to https://register.beame.io");

	/*i.question("What do you think of node.js?", function(answer) {
	
	}*/
	console.log("start arguemtns", arguments);
	var args = Array.prototype.slice.call(arguments);
	test1.apply(null, args);
}

module.exports = 
{

	start
};
