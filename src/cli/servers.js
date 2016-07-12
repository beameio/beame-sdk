"use strict";
var debug = require("debug")("beame_servers");
var BeameStore = require("../services/BeameStore");
var BeameServer = require("../services/BaseHttpsServer").SampleBeameServer;

var store = new BeameStore();

function HttpsServerTestStart(edgeClientFqdn) {
	debug("Starting %j", edgeClientFqdn);
	var lcreds = store.search(edgeClientFqdn);
	debug("lcreds %j", lcreds.length);
	if(lcreds.length != 1){
		console.error("store search returned %j", lcreds);
		throw new Error("Could not find credentials for edgeClientFqdn " + edgeClientFqdn);
	}
	new BeameServer(lcreds[0].hostname, function(data, app) {
		console.log(data);
		app.on("request", function(req, resp){
			resp.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
			resp.end('hello world\n');
			console.log("%j %j %j", req.method, req.url, req.headers);
		});

		var socketio = require('socket.io')(app);

		socketio.on('connection', function (socket) {
			console.log("Socketio connection");
			socket.emit('iping', { hello: 'world' });
			socket.on('ipong', function (data) {
				socket.emit('iping', { hello: 'world' });
			});
		});
	});
}

module.exports = {
	HttpsServerTestStart: HttpsServerTestStart
};
