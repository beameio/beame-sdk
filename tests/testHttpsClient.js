var argv = require('minimist')(process.argv.slice(2));
var _ = require('underscore');
var io = require('socket.io-client');

console.log("Argv " + argv.instance);

var socket = io.connect(argv.instance, {secure: true});

socket.on('connect', function(data){
	console.log("Connected " + data);
});
var counter = 0;
var timeStart = new Date().getTime();

socket.on('iping', function(data){
	if(new Date().getTime() - timeStart > 1000){
		console.log("counter is " + counter);
		counter = 0;
		timeStart = new Date().getTime();
	}
	counter++;
	socket.emit('ipong', { pong: "ipong" } );
});


socket.on('disconnect', function(){
	console.log("Disconnected ");
});
