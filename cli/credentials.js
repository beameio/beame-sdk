var debug = require("debug")("creds");

function show(type,  fqdn,format){
	debug("show %j %j %j", type,  fqdn, format);
}

function list(type,  fqdn,format){
	debug("list %j %j %j", type,  fqdn, format);
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
