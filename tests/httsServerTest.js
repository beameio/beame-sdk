var https = require("https");
var ProxyClient = require("beame-proxy-clients");
var beameapi = require("../index.js");
var beame_utils = require("beame-utils");

var Server = function(){
	beameapi.scanBeameDir.scanBeameDir("", function(object){
		var instance = object[0].chain.apps[0].instances[0];
		var outInstanceName = instance.hostname + "";
		var proxyUtils = new beame_utils.ProxyUtils();
		proxyUtils.selectBestProxy(undefined, function (err, data) {
			console.log(data);
			const options = {
				key: instance.key,
				cert: instance.cert
			};

			https.createServer(options, function(req, res){
				res.writeHead(200);
				res.end('hello world\n');
			}).listen(8000, function() {
                //function ProxyClient(serverType, edgeClientHostname, edgeServerHostname, targetHost, targetPort, options, agent, edgeClientCerts) {
				var proxy = new ProxyClient.ProxyClient("HTTPS", outInstanceName, data.endpoint, 'localhost', 8000, undefined, undefined, options);
                console.log("Registered Instance : " + outInstanceName);

			});
        });
    })
}


server = new Server();
