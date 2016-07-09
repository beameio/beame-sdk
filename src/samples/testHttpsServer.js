var https = require("https");
var ProxyClient = require("beame-ssl-proxy-client");
var BeameStore = require("../services/BeameStore");

var _ = require('underscore');
var fs = require('fs');

var beameDirServices = require('../services/BeameDirServices');
var debug = require("debug")("SampleBeameServer");
var beamestore = new BeameStore();
var SampleBeameServer = function(instanceHostname, hostOnlineCallback)
{
    if(!instanceHostname) {
        throw new Error("No instance found");
    }

    var edgeCert = beamestore.search(instanceHostname)[0];
    var options = {
        key: edgeCert.PRIVATE_KEY,
        cert: edgeCert.P7B,
        ca: edgeCert.CA
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
        var proxy =new ProxyClient("HTTPS", edgeCert.hostname, edgeCert.edgeHostname, 'localhost', app.address().port, {"onLocalServerCreated": onLocalServerCreated } , undefined, options);
    });
};

module.exports = { "SampleBeameServer":SampleBeameServer};
