"use strict";

const io		= require('socket.io-client')('http://127.0.0.1:65000/');

const store2    = new (require("../src/services/BeameStoreV2"))();
const fqdn		= process.argv[2];

if(!fqdn) {
	throw new Error('Must supply command line positional parameter fqdn');
}

const creds     = store2.getCredential(fqdn);

// exampleSocket.send(JSON.stringify({'type':'key','payload':arrayBufferToBase64String(keyPair.publicKey)}));
// exampleSocket.send(JSON.stringify({'type':'key','payload':{'key':arrayBufferToBase64String(keyPair.publicKey), 'token': {'signedData':'key','signedBy':'signedBy','signature':'signature'}}}));
io.emit('event', {type: 'key', payload: {key: creds.getPublicKeyDER64()}});

var peerPubKeyDerBase64 = null;

const handlers = {
	keyResponse(data) {
		console.log('KEY RESPONSE PAYLOAD %j', data);
		peerPubKeyDerBase64 = data.key;
		var decrypted = creds.decrypt(data.encryptedKey);
		console.log('keyResponse decrypted %j', decrypted);
		return {type: 'unknown', payload: 'not-yet'};
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
