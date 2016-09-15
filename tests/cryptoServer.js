"use strict";

const io            = require('socket.io')();
const NodeRsa       = require("node-rsa");

const store2        = new (require("../src/services/BeameStoreV2"))();
const tunnel        = require('../src/cli/tunnel');
const fqdn          = process.argv[2];
const Credential    = require('../src/services/Credential');

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

		var targetCreds = new Credential();
		targetCreds.initFromPubKeyDer64(peerPubKeyDerBase64);

		var encryptedKey = targetCreds.encrypt('encrypted-to-fqdn-doesnt-matter@example.com', creds.getPublicKeyDER64());
		console.log(encryptedKey);
		// io.emit('event', {type: 'key', payload: {key: creds.getPublicKeyDER64()}});

		return {type: 'keyResponse', payload: {encryptedKey}};
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
		client.emit('event', result);
	});
});
