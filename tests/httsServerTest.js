var https = require("https");
var ProxyClient = require("beame-proxy-clients");
var beameapi = require("../index.js");
var beame_utils = require("beame-utils");
var Server = require('socket.io');
var io = new Server();
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');
var fs = require('fs');
//console.log(argv);

var targetDeveloper = argv.developer;

var Server = function(){
	beameapi.scanBeameDir.scanBeameDir("", function(object){
		console.log(JSON.stringify(object, null, 2));
		var developer = _.find(object, function(item){ 
			return (item.chain.hostname + "") == targetDeveloper;
			
		});
		if(!developer || developer === ""){
			console.error("Developer " + targetDeveloper + " is not found in the");
			process.exit(1);
		}
			
		var instance = developer.chain.apps[0].instances[0];
		var outInstanceName = instance.hostname + "";
		var edgeHostname = instance.edgeHostname;
		var proxyUtils = new beame_utils.ProxyUtils();
        
var path = "/home/zglozman/.beame/r936s7lnbemo1nzb.v1.beameio.net/hl3n9lvol364ptpe.r936s7lnbemo1nzb.v1.beameio.net/civ4z3zzxjtw1tx3.v1.r.d.edge.eu-central-1a-1.v1.beameio.net/zcert.crt";

		var  options = {
			key: instance.key,
			cert: fs.readFileSync(path)+ ""
//			ca: instance.ca
//                data.rejectUnauthorized = true;
		};
		console.log(options.cert);
		var app = https.createServer(options, function(req, res){
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.end('hello world\n');
			console.log("returning hello world");
		});
		var socketio = require('socket.io')(app);

		socketio.on('connection', function (socket) {
			console.log("Socketio connection");
			socket.emit('iping', { hello: 'world' });
			socket.on('ipong', function (data) {
				socket.emit('iping', { hello: 'world' });
			});
		});
		app.listen(8000, function() {
			//function ProxyClient(serverType, edgeClientHostname, edgeServerHostname, targetHost, targetPort, options, agent, edgeClientCerts) {
			var proxy = new ProxyClient.ProxyClient("HTTPS", outInstanceName, instance.edgeHostname, 'localhost', 8000, undefined, undefined, options);
			console.log("Registered Instance : " + outInstanceName);



		});
    })
}


var server = new Server();
