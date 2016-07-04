#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');

var commands = { 
	"creds": { "file": "./creds.js" } ,
	"certs": { "file": "./certs.js" },
	"data": { "file": "./data.js" }
};

function argumentNames(fun) {
	var names = fun.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
		.replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
		.replace(/\s+/g, '').split(',');
	return names.length == 1 && !names[0] ? [] : names;
}

function command () {
	var selectedCommand = argv._[0];
	var subCommand = argv._[1];

	var foundCommand = commands[selectedCommand];

	if(foundCommand){
		try {
			var module = require(foundCommand.file);
			if(module) {
				if(typeof module[subCommand] === 'function') {
					var acceptedArgs = argumentNames(module[subCommand]);
					var argumentsArray = [];

					_.each(acceptedArgs, function(item){
						argumentsArray.push(argv[item]);
					});
					module[subCommand].apply(null, argumentsArray);
				}
			}
		} catch(e) {
			console.error("Error module not found $j", e.toString());
		}
	}
	//console.log(foundCommand);
}

command();
