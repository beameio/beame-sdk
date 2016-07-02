var https = require("https");
var ProxyClient = require("beame-proxy-clients");
var beameapi = require("../index.js");
var beame_utils = require("beame-utils");
var Server = require('socket.io');
var io = new Server();
var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');

console.log(argv);

var targetDeveloper = argv.developer;

var Server = function(){
	beameapi.scanBeameDir.scanBeameDir("", function(object){
		var developer = _.find(object, function(item){ 
			return (item.chain.hostname + "") == targetDeveloper;
		});
		if(!developer){
			console.error("Developer " + targetDeveloper + " is not found in the");
		}
			
		var instance = developer.chain.apps[0].instances[0];
		var outInstanceName = instance.hostname + "";
		var proxyUtils = new beame_utils.ProxyUtils();
		proxyUtils.selectBestProxy(undefined, function (err, data) {
			console.log(data);
			const options = {
				key: instance.key,
				cert: instance.cert,
				ca: instance.ca,
               requestCert:  true
//                data.rejectUnauthorized = true;
			};

			https.createServer(options, function(req, res){
				res.writeHead(200);
				res.end('hello world\n');
			}).listen(8000, function() {
                //function ProxyClient(serverType, edgeClientHostname, edgeServerHostname, targetHost, targetPort, options, agent, edgeClientCerts) {
				var proxy = new ProxyClient.ProxyClient("HTTPS", outInstanceName, instance.edgeHostname, 'localhost', 8000, undefined, undefined, options);
                console.log("Registered Instance : " + outInstanceName);
                var io = require('socket.io')(https);
                io.on('connection', function (socket) {
                    console.log("Socketio connection");
                    socket.emit('news', { hello: 'world' });
                    socket.on('my other event', function (data) {
                        console.log(data);
                    });
                });


			});
        });
    })
}


var server = new Server();
