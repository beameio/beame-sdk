"use strict";

const assert = require('assert').strict;
const simple = require('simple-mock');

const store = require("../../src/services/BeameStoreV2").getInstance();
const config = require("../../config/Config");
const debug = require("debug")(config.debug_prefix + "unittests:ocsp");

const local_fqdn = process.env.BEAME_TESTS_LOCAL_FQDN;
if (!local_fqdn) {
	console.error(`local fqdn is required`);
	process.exit(1)
}

describe('ocsp', function () {
	this.timeout(100000);
	let cred;

	beforeEach(() => {
		process.env.BEAME_OCSP_IGNORE = "";
		cred = store.getCredential(local_fqdn);
		assert(cred);
	});
	afterEach(() => simple.restore());

	const runs = [
		{desc: '[Without Proxy] ', external_ocsp_fqdn: "", function_name: "check" },
		{desc: '[With Proxy] ', external_ocsp_fqdn: config.SelectedProfile.ExternalOcspProxyFqdn, function_name: "verify"}
	];

	async function runOcspWithForceStatus(run, set_status) {
		process.env.EXTERNAL_OCSP_FQDN = run.external_ocsp_fqdn;

		const credential = require("../../src/services/Credential");
		const ocspUtils = require("../../src/utils/ocspUtils");
		const storeCacheServices = (require('../../src/services/StoreCacheServices')).getInstance();

		const mockSaveCredsAction = simple.mock(credential, "saveCredAction").returnWith();
		const mockSetOcspStatus = simple.mock(storeCacheServices, "setOcspStatus").returnWith(new Promise(resolve => resolve(set_status)));
		const mockWriteMetadata = simple.mock(cred.beameStoreServices, "writeMetadataSync").returnWith();
		const mockOcspUtils = simple.mock(ocspUtils, run.function_name).returnWith(new Promise(resolve => resolve(set_status)));

		const result = await cred.checkOcspStatus(cred, true);

		debug(result);
		assert(result);
		assert.equal(result, set_status);
		assert.equal(mockSaveCredsAction.callCount, 1);
		assert.equal(mockSetOcspStatus.callCount, 1);
		assert.equal(mockWriteMetadata.callCount, 1);
		assert.equal(mockOcspUtils.callCount, 1);
	}

	runs.forEach(function (run) {

		it(run.desc + 'without forceCheck', async () => {
			process.env.EXTERNAL_OCSP_FQDN = run.external_ocsp_fqdn;
			const result = await cred.checkOcspStatus(cred, false);

			debug(result);
			assert(result === config.OcspStatus.Unknown || result === config.OcspStatus.Good);
		});

		it(run.desc + 'with forceCheck', async () => {
			process.env.EXTERNAL_OCSP_FQDN = run.external_ocsp_fqdn;
			const result = await cred.checkOcspStatus(cred, true);

			debug(result);
			assert.equal(result, config.OcspStatus.Good);
		});

		it(run.desc + 'with ocsp ignore', async () => {
			process.env.EXTERNAL_OCSP_FQDN = run.external_ocsp_fqdn;

			process.env.BEAME_OCSP_IGNORE = "true";
			const result = await cred.checkOcspStatus(cred, true);

			debug(result);
			assert.equal(result, config.OcspStatus.Good);
		});

		it(run.desc + 'with Bad verify = revoked cred', async () => {
			await runOcspWithForceStatus(run,config.OcspStatus.Bad);
			assert(cred.metadata.revoked);
		});

		it(run.desc + 'with Unknown verify != revoked cred', async () => {
			await runOcspWithForceStatus(run,config.OcspStatus.Unknown);
			assert(!cred.metadata.revoked);
		});

		it(run.desc + 'with Unavailable verify != revoked cred', async () => {
			await runOcspWithForceStatus(run,config.OcspStatus.Unavailable);
			assert(!cred.metadata.revoked);
		});
	});
});