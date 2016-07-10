#!/usr/bin/env node
"use strict";
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');

var commands = {};
_.each(['creds', 'certs', 'data'], function(cmdName) {
	commands[cmdName] = require('./' + cmdName + '.js')
});

var parametersSchema = {
	'type': {
		required: false,
		options: ['developer', 'atom', 'edgeclient']
	},
	'fqdn': {
		required: false
	},
	'format': {
		required: false,
		options: ['text', 'json'],
		default: 'text'
 	},
  'atom': {
		required: false
  }
};

// http://stackoverflow.com/questions/783818/how-do-i-create-a-custom-error-in-javascript
function InvalidArgv(message) {
	this.name = 'InvalidArgv';
	this.message = message;
}

InvalidArgv.prototype = Error.prototype;

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
		throw new InvalidArgv("Command '" + cmdName + "' not found. Valid top-level commands are: " + _.keys(commands));
	}

	if(!commands[cmdName][subCmdName]) {
		throw new InvalidArgv("Sub-command '" + subCmdName + "' for command '" + cmdName + "' not found. Valid sub-commands are: " + _.keys(commands[cmdName]));
	}

	// TODO: handle boolean such as in "--fqdn --some-other-switch" or "--no-fqdn"
	// Validate argv and build arguments for the function
	var paramsNames = getParamsNames(commands[cmdName][subCmdName]);
	var args = _.map(paramsNames, function(paramName) {

		// Required parameter missing
		if(parametersSchema[paramName].required && !_.has(argv, paramName)) {
			throw new InvalidArgv("Command '" + cmdName + ' ' + subCmdName + "' - required argument '" + paramName + "' is missing.");
		}

		// Optional parameter missing
		if(!parametersSchema[paramName].required && !_.has(argv, paramName)) {
			if(parametersSchema[paramName].default) {
				return parametersSchema[paramName].default;
			}
			return null;
		}

		// Parameter must be one of the specified values ("options")
		if(parametersSchema[paramName].options) {
			if(_.indexOf(parametersSchema[paramName].options, argv[paramName]) == -1) {
				throw new InvalidArgv("Command '" + cmdName + ' ' + subCmdName + "' - argument '" + paramName + "' must be one of: " + parametersSchema[paramName].options.join(','));
			}
		}
		return argv[paramName];
	});

	// Run the command
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

if(argv._[0] == 'complete') {
	if(argv._[1] == 'commands') {
		console.log(_.keys(commands).join(' '));
		process.exit(0);
	}
	if(argv._[1] == 'sub-commands') {
		console.log(_.keys(commands[argv._[2]]).join(' '));
		process.exit(0);
	}
	if(argv._[1] == 'switches') {
		var f = commands[argv._[2]][argv._[3]];
		var paramsNames = getParamsNames(f);
		var switches = paramsNames.map(function(p) { return "--" + p; }).join(' ');
		console.log(switches);
		process.exit(0);
	}
	if(argv._[1] == 'switch-value') {
		var sw = argv._[2];
		if(parametersSchema[sw].options) {
			console.log(parametersSchema[sw].options.join(' '));
			process.exit(0);
		}
		process.exit(0);
	}
	process.exit(1);
}

main();
