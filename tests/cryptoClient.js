"use strict";

const io            = require('socket.io-client')('http://127.0.0.1:65000/');
const crypto        = require('crypto');

const store2        = new (require("../src/services/BeameStoreV2"))();
const Credential    = require('../src/services/Credential');

const fqdn          = process.argv[2];

if(!fqdn) {
	throw new Error('Must supply command line positional parameter fqdn');
}

const creds     = store2.getCredential(fqdn);

// exampleSocket.send(JSON.stringify({'type':'key','payload':arrayBufferToBase64String(keyPair.publicKey)}));
// exampleSocket.send(JSON.stringify({'type':'key','payload':{'key':arrayBufferToBase64String(keyPair.publicKey), 'token': {'signedData':'key','signedBy':'signedBy','signature':'signature'}}}));
io.emit('event', {type: 'key', payload: {key: creds.getPublicKeyDER64()}});

var sharedSecret = crypto.randomBytes(32);
var peerPubKeyDerBase64 = null;

const handlers = {
	keyResponse(data) {
		peerPubKeyDerBase64 = data.key;
		var peerPubKeyDerBase64 = creds.decrypt(data.encryptedKey);
		console.log('keyResponse decrypted %j', peerPubKeyDerBase64);
		
		var peerCreds = new Credential();
		peerCreds.initFromPubKeyDer64(peerPubKeyDerBase64);

		var encryptedSharedSecret = peerCreds.encrypt('encrypted-to-fqdn-doesnt-matter@example.com', sharedSecret);
		console.log('sharedSecret %j encryptedSharedSecret %j', sharedSecret, encryptedSharedSecret);

		return {type: 'aesKey', payload: {encryptedSharedSecret}};
	}
}

io.on('event', data => {
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
	io.emit('event', result);
});
