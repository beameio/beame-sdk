#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');

var commands = {}
_.map(['creds', 'certs', 'data'], function(module) {
	commands[module] = require('./' + module + '.js')
});

function getParamsNames(fun) {
	var names = fun.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
		.replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
		.replace(/\s+/g, '').split(',');
	return names.length == 1 && !names[0] ? [] : names;
}

function main() {
	var cmdName = argv._[0];
	var subCmdName = argv._[1];

	var cmd = commands[cmdName];

	if(!cmd) {
		throw new Error("Command '"+cmdName+"' not found. Valid top-level commands are: " + _.keys(commands));
	}

	if(typeof commands[cmdName][subCmdName] !== 'function') {
		throw new Error("Sub-command '"+subCmdName+"' for command '"+cmdName+"' not found. Valid sub-commands are: " + _.keys(commands[cmdName]));
	}

	var paramsNames = getParamsNames(commands[cmdName][subCmdName]);
	var args = _.map(paramsNames, function(paramName) { return argv[paramName]; });
	commands[cmdName][subCmdName].apply(null, args);
}

function usage() {
    console.log("Usage:");
    console.log("  TODO");
}

if(argv._.length < 2) {
    usage();
    process.exit(1);
}

main();
