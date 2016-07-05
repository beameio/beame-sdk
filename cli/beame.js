#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');

var commands = {}
_.each(['creds', 'certs', 'data'], function(cmdName) {
	commands[cmdName] = require('./' + cmdName + '.js')
});

var parametersSchema = {
	'type': {
		required: true,
		options: ['developer', 'atom', 'instance']
	},
	'fqdn': {
		required: true
	},
	'format': {
		required: false,
		options: ['text', 'json'],
		default: 'text'
	}
};

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

	if(!commands[cmdName][subCmdName]) {
		throw new Error("Sub-command '"+subCmdName+"' for command '"+cmdName+"' not found. Valid sub-commands are: " + _.keys(commands[cmdName]));
	}

	var paramsNames = getParamsNames(commands[cmdName][subCmdName]);
	var args = _.map(paramsNames, function(paramName) { return argv[paramName]; });
	commands[cmdName][subCmdName].apply(null, args);
}

function usage() {
	var myname = 'beame.js';
    console.log("Usage:");
	_.each(commands, function(subCommands, cmdName) {
		_.each(subCommands, function(subCmdFunc, subCmdName) {
			var paramsNames = getParamsNames(subCmdFunc);
			var params = paramsNames.map(function(paramName) {
				var ret = '--' + paramName;
				if(parametersSchema[paramName].options) {
					ret = ret + ' {' + parametersSchema[paramName].options.join('|') + '}';
				} else {
					ret = ret + ' ' + paramName;
				}
				if(!parametersSchema[paramName].required) {
					ret = '[' + ret + ']';
				}
				return ret;
			});
			console.log('  ' + myname + ' ' + cmdName + ' ' + subCmdName + ' ' + params.join(' '));
		})
	});
}

if(argv._.length < 2) {
    usage();
    process.exit(1);
}

main();
