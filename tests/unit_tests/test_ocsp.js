"use strict";

const assert = require('assert');
const simple = require('simple-mock');
const commonUtils = require('../../src/utils/CommonUtils');
const store = new (require("../../src/services/BeameStoreV2"))();
const debug = require("debug")("test_ocsp");

const local_fqdn = process.env.BEAME_TESTS_LOCAL_FQDN;
if (!local_fqdn) {
	console.error(`local fqdn is required`);
	process.exit(1)
}

const cred = store.getCredential(local_fqdn);
if (!cred) {
	throw new Error(`Credential for ${local_fqdn} not found`);
}

function mockRetryFn() {
	return simple.mock(commonUtils, "retry").callFn(async function (func, retries = 5) {
		let error = "";
		for (let i = 1; i <= retries; ++i) { // retry
			try {
				return await func();
			} catch (e) {
				error = e;
				debug(`Call failed with error '${error}'. Retry [${i}/${retries}]`);
			}
		}
		throw error;
	});
}

describe('Test ocsp check', function () {
	this.timeout(100000);

	beforeEach(() => process.env.BEAME_THROW_OCSP = "");
	afterEach(() => simple.restore());

	const runs = [
		{desc: '[Without Proxy] ', external_ocsp_fqdn: "", function_name: "checkOcspStatusWithoutExternalOcsp" },
		{desc: '[With Proxy] ', external_ocsp_fqdn: "iep9bs1p7cj3cmit.tl5h1ipgobrdqsj6.v1.p.beameio.net", function_name: "checkOcspStatusWithExternalOcsp"}
	];
	runs.forEach(function (run) {

		it(run.desc + 'without forceCheck', async () => {
			process.env.EXTERNAL_OCSP_FQDN = run.external_ocsp_fqdn;
			const result = await cred.checkOcspStatus(cred, false);

			debug(result);
			assert(result);
			assert(result.status);
			assert(!result.message);
		});

		it(run.desc + 'with forceCheck', async () => {
			process.env.EXTERNAL_OCSP_FQDN = run.external_ocsp_fqdn;
			const result = await cred.checkOcspStatus(cred, true);

			debug(result);
			assert(result);
			assert(result.status);
			assert(!result.message);
		});

		it(run.desc + 'with failing ocsp', async () => {
			process.env.EXTERNAL_OCSP_FQDN = run.external_ocsp_fqdn;
			const errorMessage = run.function_name + " test error";
			const checkOCSPFn = simple.mock(cred, run.function_name).throwWith(new Error(errorMessage));
			const retryFn = mockRetryFn();
			const result = await cred.checkOcspStatus(cred, true);

			debug(result);
			assert(result);
			assert(result.status);
			assert.strictEqual(result.message, errorMessage);
			assert.strictEqual(retryFn.callCount, 1);
			assert.strictEqual(checkOCSPFn.callCount, 5);
		});

		it(run.desc + 'with failing ocsp & BEAME_THROW_OCSP', async () => {
			process.env.EXTERNAL_OCSP_FQDN = run.external_ocsp_fqdn;
			process.env.BEAME_THROW_OCSP = "true";
			const errorMessage = run.function_name + " test error";
			const checkOCSPFn = simple.mock(cred, run.function_name).throwWith(new Error(errorMessage));
			const retryFn = mockRetryFn();

			try {
				await cred.checkOcspStatus(cred, true);
				assert.fail("Should have thrown exception");
			} catch (e) {
				debug(`expected catch => error was '${e.message}'`);
				assert.strictEqual(e.message, errorMessage);
				assert.strictEqual(retryFn.callCount, 1);
				assert.strictEqual(checkOCSPFn.callCount, 5);
			}
		});
	});
});