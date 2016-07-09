"use strict";

var _ = require('underscore');
var fs = require('fs');
var jmespath = require('jmespath');
var beameDirServices = require('../services/BeameDirServices');
var debug = require("debug")("cred_api");
var BeameDirectApi = require("../services/BeameDirServices");
var BeameStore = require("../services/BeameStore");
var store = new BeameStore();
var Table = require('cli-table2');
const x509 = require('x509');
///
// We want to print out
// Level, hostname,
//


function show(type, fqdn, format){
	debug("show %j %j %j", type,  fqdn, format);
	var headers = ['Name', "Print", "Serial", "SigAlg" ];

	var returnValues =listCreds(type, fqdn);
	var certs = [];
	var table = new Table({
		head: headers
		, colWidths: [25, 65, 30, 30]
	});

	_.each(returnValues, _.bind(function(cert){
		var item = store.search(cert.hostname);
		const x509 = require('x509');
		var cert = x509.parseCert(item[0].X509 + "");
		table.push([cert.subject.commonName, cert.fingerPrint, cert.serial,  cert.signatureAlgorithm]);
		certs.push(cert);
	}, this));

	if(format == "json") {
		console.log(JSON.stringify(certs));
	}
	else {
		console.log(table.toString());
	}
}

function print_table(arrayToPrint, format){
	switch(format) {
		case "json":
		{
			console.log(JSON.stringify(arrayToPrint));
			break;
		};

		case "text":
		default:
		{
			var headers = [];
			_.each(arrayToPrint, function (item) {
				_.map(item, function(key, value ){
					headers.push(value);
				})
			});
			headers = _.uniq(headers);

			var table = new Table({
				head: headers
				, colWidths: [15, 70, 15]
			});
			_.each(arrayToPrint, function (item) {
				table.push([item.name, item.hostname, item.level]);
			});

			console.log(table.toString());

		};
	}
};

function listCreds(type, fqdn){
	var returnValues = [];
	if(type && !fqdn) {
		returnValues = store.list(type);
	}
	if(!type && fqdn) {
		returnValues = store.list("", fqdn);
	}
	if(!type && !fqdn) {
		returnValues = store.list();
	}
	return returnValues;
}

function list(type,  fqdn,format){
	debug("list %j %j %j", type,  fqdn, format);
	var returnValues = listCreds(type, fqdn);

	print_table(returnValues, format);

}

function create(type,  fqdn,format){
	debug ( "create %j %j %j",  type,  fqdn, format);
}

function renew(type,  fqdn,format){
	debug ( "renew %j %j %j",  type,  fqdn, format);
}

function purge(type,  fqdn,format){
	debug ( "purge %j %j %j",  type,  fqdn, format);
}


module.exports = {
	show:	show,
	list:	list,
	create:	create,
	renew:	renew,
	purge:	purge
};
