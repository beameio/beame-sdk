"use strict";

var _ = require('underscore');
var fs = require('fs');
var jmespath = require('jmespath');
var beameDirServices = require('../services/BeameDirServices');
var debug = require("debug")("cred_api");

var store = new BeameStore();



function show(fqdn, format){
	debug("show %j %j %j", type,  fqdn, format);
}

function list(type,  fqdn,format){
	debug("list %j %j %j", type,  fqdn, format);
   
	var object = beameDirServices.readBeameDir("");
	

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
