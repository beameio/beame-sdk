"use strict";
var debug       = require("debug")("beame_servers");
var BeameStore  = require("../services/BeameStore");
var BeameServer = require("../services/BaseHttpsServer").SampleBeameServer;

function HttpsServerTestStart(edgeClientFqdn) {
	console.warn("Starting server %j", edgeClientFqdn);
	new BeameServer(edgeClientFqdn, null, false, function (data, app) {
		debug("BeameServer callback got %j", data);
		app.on("request", function (req, resp) {
			resp.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
			resp.end('hello world\n');
			console.log("%j %j %j", req.method, req.url, req.headers);
		});

		var socketio = require('socket.io')(app);
		//noinspection JSUnresolvedFunction
		socketio.set('transports', ['websocket']);

		//noinspection JSUnresolvedFunction
		socketio.on('connection', function (socket) {
			console.log("Socketio connection");
			socket.emit('iping', {hello: 'world'});
			socket.on('ipong', function () {
				socket.emit('iping', {hello: 'world'});
			});
		});
	});
}

module.exports = {
	HttpsServerTestStart: HttpsServerTestStart
};
