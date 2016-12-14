"use strict";

const io            = require('socket.io')();
const NodeRsa       = require("node-rsa");

const store2        = new (require("../src/services/BeameStoreV2"))();
const tunnel        = require('../src/cli/tunnel');
const fqdn          = process.argv[2];
const Credential    = require('../src/services/Credential');
const crypto        = require('../src/cli/crypto');

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
var sharedSecret = null;

const handlers = {
	key(payload) {
		console.log('KEY PAYLOAD %j', payload);
		peerPubKeyDerBase64 = payload.data;

		var peerCreds = new Credential();
		peerCreds.initFromPubKeyDer64(peerPubKeyDerBase64);

		var encryptedKey = peerCreds.encrypt('encrypted-to-fqdn-doesnt-matter@example.com', creds.getPublicKeyDER64());
		console.log(encryptedKey);
		// io.emit('event', {type: 'key', payload: {key: creds.getPublicKeyDER64()}});

		return {_type: 'keyResponse', payload: {encryptedKey}};
	},
	aesKey(payload) {
		// XXX continue here.
		// Getting sharedSecret wrong. Probably encoding issues because it starts correctly.
		sharedSecret = new Buffer(creds.decrypt(payload.encryptedSharedSecret), 'base64');
		// console.log('sharedSecret %j', sharedSecret);

		var peerCreds = new Credential();
		peerCreds.initFromPubKeyDer64(peerPubKeyDerBase64);
		var encrypted = crypto.aesEncrypt('abc123', sharedSecret);

		return {"_type": 'encryptedMessage', payload: {data: encrypted[1].IV + encrypted[0].AES128CBC}};
	}
}

io.on('connection', client => {
	console.log('SocketIO connection');
	// console.log('Received SocketIO message %j', msg);
	client.on('event', data => {
		var result;
		console.log('SocketIO event: %j', data);
		if(!data._type) {
			console.error('Data has no type field');
			return;
		}
		if(!handlers[data._type]) {
			console.error('Unknown data type', data._type);
			return;
		}
		result = handlers[data._type](data.payload);
		console.log('SocketIO result: %j', result);
		client.emit('event', result);
	});
});
