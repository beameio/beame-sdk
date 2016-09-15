"use strict";

const io		= require('socket.io')();
const tunnel    = require('../src/cli/tunnel');
const fqdn		= process.argv[2];

// SOCKET_MSG_TYPES[] = { @"key", @"signkey",@"data",@"symdata",@"symdatawithiv",@"cert"};

if(!fqdn) {
	throw new Error('Must supply command line positional parameter fqdn');
}

const creds = store2.getCredential(fqdn);

console.log("Starting crypto functions SocketIO server");
io.listen(65000);

console.log(`Using local port ${io.httpServer.address().port}`);

// console.log(`Will create beame tunnel using fqdn ${fqdn} to forward traffic to local SocketIO server`);
// tunnel.httpsTunnel(fqdn, '127.0.0.1', io.httpServer.address().port, 'http');

var peerPubKeyDerBase64 = null;

const handlers = {
	key(data) {
		console.log('KEY PAYLOAD %j', data);
		peerPubKeyDerBase64 = data.key;
	}
}

io.on('connection', client => {
	console.log('SocketIO connection');
	// console.log('Received SocketIO message %j', msg);
	client.on('event', data => {
		var result;
		console.log('SocketIO event: %j', data);
		if(!data.type) {
			console.error('Data has no type field');
			return;
		}
		if(!handlers[data.type]) {
			console.error('Unknown data type', data.type);
			return;
		}
		result = handlers[data.type](data.payload);
		console.log('SocketIO result: %j', result);
	});
});
