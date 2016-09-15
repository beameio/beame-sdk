"use strict";

const io		= require('socket.io-client')('http://127.0.0.1:65000/');

io.emit('event', {"type": "key", "payload": "_publicKeyB64_"});
