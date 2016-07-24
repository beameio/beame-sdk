"use strict";
var debug = require("debug")("beame_servers");
var BeameStore = require("../services/BeameStore");
var BeameServer = require("../services/BaseHttpsServer").SampleBeameServer;

var store = new BeameStore();

function HttpsServerTestStart(edgeClientFqdn) {
	console.warn("Starting server %j", edgeClientFqdn);
	new BeameServer(edgeClientFqdn,  false, function(data, app) {
		debug("BeameServer callback got %j", data);
		// console.log('XXX', data);
		app.on("request", function(req, resp){
			resp.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
			resp.end('hello world\n');
			console.log("%j %j %j", req.method, req.url, req.headers);
		});

		var socketio = require('socket.io')(app);
		socketio.set('transports', ['websocket']);

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
