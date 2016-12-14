"use strict";

const io            = require('socket.io-client')('http://127.0.0.1:65000/');
const crypto        = require('crypto');
const beameCrypto   = require('../src/cli/crypto');

const store2        = new (require("../src/services/BeameStoreV2"))();
const Credential    = require('../src/services/Credential');

const fqdn          = process.argv[2];

if(!fqdn) {
	throw new Error('Must supply command line positional parameter fqdn');
}

const creds     = store2.getCredential(fqdn);

// TODO: signKey

// exampleSocket.send(JSON.stringify({'type':'key','payload':arrayBufferToBase64String(keyPair.publicKey)}));
// exampleSocket.send(JSON.stringify({'type':'key','payload':{'key':arrayBufferToBase64String(keyPair.publicKey), 'token': {'signedData':'key','signedBy':'signedBy','signature':'signature'}}}));
io.emit('event', {_type: 'key', payload: {data: creds.getPublicKeyDER64()}});

var sharedSecret = crypto.randomBytes(16);
var peerPubKeyDerBase64 = null;

const handlers = {
	keyResponse(data) {
		peerPubKeyDerBase64 = data.key;
		var peerPubKeyDerBase64 = creds.decrypt(data.encryptedKey);
		// console.log('keyResponse decrypted %j', peerPubKeyDerBase64);

		var peerCreds = new Credential();
		peerCreds.initFromPubKeyDer64(peerPubKeyDerBase64);

		var encryptedSharedSecret = peerCreds.encrypt('encrypted-to-fqdn-doesnt-matter@example.com', sharedSecret.toString('base64'));
		// console.log('sharedSecret %j encryptedSharedSecret %j', sharedSecret, encryptedSharedSecret);

		return {_type: 'aesKey', payload: {encryptedSharedSecret}};
	},
	encryptedMessage(data) {
		const IV = data.data.slice(0, 24);
		const encryptedData = data.data.slice(24);
		const encryptedStruct = [
			{AES128CBC: encryptedData},
			{IV: IV, sharedCipher:sharedSecret}
		];
		// XXX: continue here
		const decrypted = beameCrypto.aesDecrypt(encryptedStruct);
		console.log('Decrypted', decrypted);
	}
};

io.on('event', data => {
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
	if(result) {
		io.emit('event', result);
	}
});
