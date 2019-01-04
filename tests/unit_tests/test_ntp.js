"use strict";

const assert = require('assert');
const ntpClient = require('ntp-client');
const util = require('util');
const debug = require("debug")("test_ntp");

const ntpServer = process.env.BEAME_TESTS_NTP_SERVER || "pool.ntp.org";
const ntpServerPort = process.env.BEAME_TESTS_NTP_SERVER_PORT || 123;

describe('NTP test', () => {
	it('check date', async () => {
		const date = await util.promisify(ntpClient.getNetworkTime.bind(ntpClient, ntpServer, ntpServerPort))();
		const local = new Date();

		debug("Current ntp time is: ", date);
		assert(date);
		debug("Current machine time is: ", local);
		assert(local);

		const diff =  (date.getTime() - local.getTime()) / 1000;
		debug("diff is : ",diff);
		assert(-0.05 > diff < 0.05);
	});
});