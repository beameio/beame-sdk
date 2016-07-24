/**
 * Created by zenit1 on 24/07/2016.
 */


var creds = require('../../../src/cli/creds');


creds.stats('fbab72gkxgk3imgm.v1.beameio.net',function (error,payload) {
	console.log('stats callback received with %j and error %j',payload,error);
});