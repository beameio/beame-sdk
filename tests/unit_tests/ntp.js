/**
 * Created by zenit1 on 02/04/2017.
 */
"use strict";

const ntpClient = require('ntp-client');

ntpClient.getNetworkTime("pool.ntp.org", 123, function(err, date) {
	if(err) {
		console.error(err);
		return;
	}

	let local = new Date();
	console.log("Current ntp time : ",date);

	console.log("Current machine time : ",local);

	console.log("diff is : ",(date.getTime() -local.getTime())/1000);
});