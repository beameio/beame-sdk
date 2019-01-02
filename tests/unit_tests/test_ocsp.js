const config        = require('./config');
const assert        = config.assert;
const store         = config.beameStore;
const logger        = new config.Logger("TestCredential");
const mock 			= require('mock-require');

var local_fqdn = process.env.local_fqdn;

if (!local_fqdn) {
	logger.error(`local fqdn is required`);
	process.exit(1)
}

let cred = store.getCredential(local_fqdn);
if (!cred) {
	throw new Error(`Credential for ${local_fqdn} not found`);
}

describe('Test ocsp check on fqdn', function() {
	this.timeout(10000);
	beforeEach(() => {
		process.env.EXTERNAL_OCSP_FQDN = "";
	});

	it('with force', async () => {
		const result = await cred.checkOcspStatus(cred, true);
		console.log(result);
		assert(result && result.status)
	});

	it('without force', async () => {
		const result = await cred.checkOcspStatus(cred, false);
		console.log(result);
		assert(result && result.status)
	});

	it('with failing ocsp check', async () => {
		mock('ocsp', { check: function() {
				console.log('ocsp.check called');
			}});
		const result = await cred.checkOcspStatus(cred, true);
		console.log(result);
		assert(result && !result.status);
	});
});

describe('Test ocsp check on fqdn with EXTERNAL_OCSP_FQDN', function() {
	this.timeout(10000);
	beforeEach(() => {
		process.env.EXTERNAL_OCSP_FQDN = "iep9bs1p7cj3cmit.tl5h1ipgobrdqsj6.v1.p.beameio.net";
	});

	it('with force', async () => {
		const result = await cred.checkOcspStatus(cred, true);
		console.log(result);
		assert(result && result.status)
	});

	it('without force', async () => {
		const result = await cred.checkOcspStatus(cred, false);
		console.log(result);
		assert(result && result.status);
	});

	it('with failing ocsp verify', async () => {
		mock('ocsp', { verify: function() {
				console.log('ocsp.verify called');
			}});
		const result = await cred.checkOcspStatus(cred, true);
		console.log(result);
		assert(result && !result.status);
	});
});