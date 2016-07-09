var https = require("https");
var ProxyClient = require("beame-ssl-proxy-client");
var beamestore = require("../services/BeameStore");

var _ = require('underscore');
var fs = require('fs');

var beameDirServices = require('../services/BeameDirServices');
var debug = require("debug")("SampleBeameServer");

var SampleBeameServer = function(instanceHostname, hostOnlineCallback)
{
    if(!instanceHostname) {
        throw new Error("No instance found");
    }

				var edgeCert = beamestore.searchEdge(instanceHostname);
				var options = {
								key: edgeCreds.PRIVATE_KEY,
								cert: edgeCreds.P7B,
								ca: edgeCreds.CA

								// Client certificates - start
//										requestCert: true,
//										rejectUnauthorized: false
								// Client certificates - end
				};

								var app = https.createServer(options);
								app.listen(0, function() {
												//ProxyClient(serverType, edgeClientHostname, edgeServerHostname, targetHost, targetPort, options, agent, edgeClientCerts)
												var onLocalServerCreated = function(data){
																if(hostOnlineCallback){
																				hostOnlineCallback(data, app);
																}

												};
												
												address = app.address();
												var proxy =new ProxyClient("HTTPS", creds.hostname, creds.edgeHostname, 'localhost', app.address().port, {"onLocalServerCreated": onLocalServerCreated } , undefined, options);
												});
};

module.exports = { "SampleBeameServer":SampleBeameServer};
