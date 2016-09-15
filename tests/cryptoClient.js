"use strict";

const io		= require('socket.io-client')('http://127.0.0.1:65000/');

const store2    = new (require("../src/services/BeameStoreV2"))();
const fqdn		= process.argv[2];

if(!fqdn) {
	throw new Error('Must supply command line positional parameter fqdn');
}

const creds     = store2.getCredential(fqdn);

const pubKeyLines = creds.publicKeyStr.split('\n');

const pubKeyDerBase64 = pubKeyLines.slice(1, pubKeyLines.length-1).join('\n');

// exampleSocket.send(JSON.stringify({'type':'key','payload':arrayBufferToBase64String(keyPair.publicKey)}));
// exampleSocket.send(JSON.stringify({'type':'key','payload':{'key':arrayBufferToBase64String(keyPair.publicKey), 'token': {'signedData':'key','signedBy':'signedBy','signature':'signature'}}}));
io.emit('event', {type: 'key', payload: {key: pubKeyDerBase64}});
