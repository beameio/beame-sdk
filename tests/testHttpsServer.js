var https = require("https");
var ProxyClient = require("beame-ssl-proxy-client");
var beameapi = require("../index.js");
//var beame_utils = require("beame-utils");
// var Server = require('socket.io');
// var io = new Server();
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');
var fs = require('fs');
var beameDirServices = new (require('../src/services/BeameDirServices'))();
var targetDeveloper = argv.developer;

var Server = function(){
	var object = beameDirServices.scanBeameDir("",true);


		//console.log(JSON.stringify(object, null, 2));
		/*var developer = _.find(object, function(item){
			return (item.chain.hostname + "") == targetDeveloper;

		});
		if(!developer){
			console.error("Developer " + targetDeveloper + " is not found.");
			process.exit(1);
		}
*/
		var instance = object.developer['k0drvjv4rw4ehmq4.v1.beameio.net'].atom['tailmfm5cpy5jdgi.k0drvjv4rw4ehmq4.v1.beameio.net'].edgeclient['qk7017hyxl72b23m.v1.r.d.edge.eu-central-1b-1.v1.beameio.net'];
		var outInstanceName = instance.hostname + "";

		var options = {
			key: instance.PRIVATE_KEY,
			cert: instance.P7B,
			ca: instance.CA,

			// Client certificates - start
//			requestCert: true,
//			rejectUnauthorized: false
			// Client certificates - end
		};

		var app = https.createServer(options, function(req, res){
			res.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Beame.io test server'});
			res.end('hello world\n');
			console.log("returning hello world");
		});
		var socketio = require('socket.io')(app);

		socketio.on('connection', function (socket) {
			console.log("Socketio connection");
			socket.emit('iping', { hello: 'world' });
			socket.on('ipong', function (data) {
				socket.emit('iping', { hello: 'world' ,data:data});
			});
		});
		app.listen(8000, function() {
			//ProxyClient(serverType, edgeClientHostname, edgeServerHostname, targetHost, targetPort, options, agent, edgeClientCerts)

			new ProxyClient("HTTPS", instance.metadata.hostname, instance.metadata.edgeHostname, 'localhost', 8000, undefined, undefined, options);
			console.log("Registered Instance : " + instance.metadata.hostname);
		});

};

var server = new Server();
