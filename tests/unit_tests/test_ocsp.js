"use strict";

const assert = require('assert').strict;
const simple = require('simple-mock');
const path = require('path');
const util = require('util');

const store = require("../../src/services/BeameStoreV2").getInstance();
const ocspUtils = require('../../src/utils/ocspUtils');

const config = require("../../config/Config");
const DirectoryServices = require('../../src/services/DirectoryServices');

const debug = require("debug")(config.debugPrefix + "unittests:ocsp");

assert(process.env.BEAME_TESTS_LOCAL_FQDN, `Env BEAME_TESTS_LOCAL_FQDN is required to run the tests`);
assert(process.env.BEAME_TESTS_LOCAL_ROOT_FQDN, "Env BEAME_TESTS_LOCAL_ROOT_FQDN is required to run the tests");


describe('ocsp', function () {
	this.timeout(100000);
	let cred;

	beforeEach(() => {
		process.env.BEAME_OCSP_IGNORE = "";
		cred = store.getCredential(process.env.BEAME_TESTS_LOCAL_FQDN);
		assert(cred);
	});
	afterEach(() => simple.restore());

	const runs = [
		{desc: '[Without Proxy] ', external_ocsp_fqdn: "", external_ocsp_signing_fqdn: "", function_name: "check" },
		{desc: '[With Proxy] ', external_ocsp_fqdn: config.SelectedProfile.OcspProxyFqdn, external_ocsp_signing_fqdn: process.env.BEAME_TESTS_LOCAL_ROOT_FQDN,function_name: "verify"}
	];

	async function runOcspWithMockStatus(run, set_status) {
		config.SelectedProfile.ExternalOcspFqdn = run.external_ocsp_fqdn;
		config.SelectedProfile.ExternalOcspSigningFqdn = run.external_ocsp_signing_fqdn;

		const credential = require("../../src/services/Credential");
		const ocspUtils = require("../../src/utils/ocspUtils");

		const mockSaveCredsAction = simple.mock(credential, "saveCredAction").returnWith();
		const mockWriteMetadata = simple.mock(cred.beameStoreServices, "writeMetadataSync").returnWith();
		const mockOcspUtils = simple.mock(ocspUtils, run.function_name).resolveWith(set_status);

		const result = await cred.checkOcspStatus(cred, true);

		debug(result);
		assert(result);
		assert.equal(result, set_status);
		assert.equal(mockSaveCredsAction.callCount, 1);
		assert.equal(mockWriteMetadata.callCount, 1);
		assert.equal(mockOcspUtils.callCount, 1);
	}

	runs.forEach(function (run) {

		it(run.desc + 'without forceCheck', async () => {
			config.SelectedProfile.ExternalOcspFqdn = run.external_ocsp_fqdn;
			config.SelectedProfile.ExternalOcspSigningFqdn = run.external_ocsp_signing_fqdn;

			const result = await cred.checkOcspStatus(cred, false);

			debug(result);
			assert.equal(result, config.OcspStatus.Good);
		});

		it(run.desc + 'with forceCheck', async () => {
			config.SelectedProfile.ExternalOcspFqdn = run.external_ocsp_fqdn;
			config.SelectedProfile.ExternalOcspSigningFqdn = run.external_ocsp_signing_fqdn;

			const result = await cred.checkOcspStatus(cred, true);

			debug(result);
			assert.equal(result, config.OcspStatus.Good);
		});

		it(run.desc + 'with ocsp ignore', async () => {
			config.SelectedProfile.ExternalOcspFqdn = run.external_ocsp_fqdn;
			config.SelectedProfile.ExternalOcspSigningFqdn = run.external_ocsp_signing_fqdn;

			process.env.BEAME_OCSP_IGNORE = "true";
			const result = await cred.checkOcspStatus(cred, true);

			debug(result);
			assert.equal(result, config.OcspStatus.Good);
		});

		it(run.desc + 'with Bad verify = revoked cred', async () => {
			await runOcspWithMockStatus(run,config.OcspStatus.Revoked);
			assert(cred.revoked);
		});

		it(run.desc + 'with Unavailable verify != revoked cred', async () => {
			await runOcspWithMockStatus(run,config.OcspStatus.Unavailable);
			assert(!cred.revoked);
		});
	});
});

describe('ocspUtils', function() {
	this.timeout(100000);
	let cred;

	beforeEach(() => {
		cred = store.getCredential(process.env.BEAME_TESTS_LOCAL_FQDN);
		assert(cred);
	});

	it('_parseOcspResponse - good', async () => {
		const res = ocspUtils._parseOcspResponse({type: 'good'});
		assert.equal(res, config.OcspStatus.Good);
	});

	it('_parseOcspResponse - revoked', async () => {
		const res = ocspUtils._parseOcspResponse({type: 'revoked'});
		assert.equal(res, config.OcspStatus.Revoked);
	});

	it('_parseOcspResponse - wrong input combinations', async () => {
		let res = ocspUtils._parseOcspResponse({type: 'bad'}); // not an official response type
		assert.equal(res, config.OcspStatus.Unavailable);

		res = ocspUtils._parseOcspResponse({type23: 'good'}); // not an official response type
		assert.equal(res, config.OcspStatus.Unavailable);

		res = ocspUtils._parseOcspResponse({});
		assert.equal(res, config.OcspStatus.Unavailable);

		res = ocspUtils._parseOcspResponse();
		assert.equal(res, config.OcspStatus.Unavailable);
	});

	it('generateOcspRequest - with x509 and pem', async () => {
		const issuerCertUrl = cred.certData.issuer.issuerCertUrl;
		assert(issuerCertUrl);
		const certName = issuerCertUrl.substring(issuerCertUrl.lastIndexOf('/') + 1);
		const pemPath = path.join(config.issuerCertsPath, `${certName.substring(0, certName.lastIndexOf('.'))}.pem`);
		assert(DirectoryServices.doesPathExists(pemPath));

		const res = ocspUtils.generateOcspRequest(cred.fqdn, cred.X509, pemPath);
		assert(res);
	});

	it('generateOcspRequest - no x509 & no pem combinations', async () => {
		const issuerCertUrl = cred.certData.issuer.issuerCertUrl;
		assert(issuerCertUrl);
		const certName = issuerCertUrl.substring(issuerCertUrl.lastIndexOf('/') + 1);
		const pemPath = path.join(config.issuerCertsPath, `${certName.substring(0, certName.lastIndexOf('.'))}.pem`);

		assert(DirectoryServices.doesPathExists(pemPath));

		let res = ocspUtils.generateOcspRequest(cred.fqdn, cred.X509, null);
		assert.equal(res, null);

		res = ocspUtils.generateOcspRequest(cred.fqdn, null, pemPath);
		assert.equal(res, null);

		res = ocspUtils.generateOcspRequest(cred.fqdn, null, null);
		assert.equal(res, null);

		res = ocspUtils.generateOcspRequest();
		assert.equal(res, null);
	});

	it('getOcspUri - good input', async () => {
		const res = await ocspUtils.getOcspUri(cred.X509);
		assert(res);
		assert(res.startsWith('http'));
	});

	it('getOcspUri - wrong input combinations', async () => {
		try {
			await ocspUtils.getOcspUri();
			assert.fail('Should throw exception');
		}
		catch(err) {
			assert(err);
		}

		try {
			await ocspUtils.getOcspUri(null);
			assert.fail('Should throw exception');
		}
		catch(err) {
			assert(err);
		}
	});

	it('check - good input', async () => {
		const issuerCertUrl = cred.certData.issuer.issuerCertUrl;
		assert(issuerCertUrl);
		const certName = issuerCertUrl.substring(issuerCertUrl.lastIndexOf('/') + 1);
		const pemPath = path.join(config.issuerCertsPath, `${certName.substring(0, certName.lastIndexOf('.'))}.pem`);
		assert(DirectoryServices.doesPathExists(pemPath));

		let res = await ocspUtils.check(cred.fqdn, cred.X509, pemPath);
		assert.equal(res, config.OcspStatus.Good);

		res = await ocspUtils.check(null, cred.X509, pemPath); // fqdn is not mandatory
		assert.equal(res, config.OcspStatus.Good);
	});


	it('check - wrong input combinations', async () => {
		const issuerCertUrl = cred.certData.issuer.issuerCertUrl;
		assert(issuerCertUrl);
		const certName = issuerCertUrl.substring(issuerCertUrl.lastIndexOf('/') + 1);
		const pemPath = path.join(config.issuerCertsPath, `${certName.substring(0, certName.lastIndexOf('.'))}.pem`);
		assert(DirectoryServices.doesPathExists(pemPath));

		let res = await ocspUtils.check(cred.fqdn, null, pemPath);
		assert.equal(res, config.OcspStatus.Unavailable);
		res = await ocspUtils.check(null, null, pemPath);
		assert.equal(res, config.OcspStatus.Unavailable);

		try {
			await ocspUtils.check(cred.fqdn, cred.X509, null);
			assert('Should fail because its unable to read file');
		}
		catch (e) {
			assert(e);
		}
		try {
			await ocspUtils.check(cred.fqdn, cred.X509);
			assert('Should fail because its unable to read file');
		}
		catch (e) {
			assert(e);
		}
		try {
			await ocspUtils.check(cred.fqdn, cred.X509, "path_that_doesnt_exist");
			assert('Should fail because its unable to read file');
		}
		catch (e) {
			assert(e);
		}
		try {
			await ocspUtils.check();
			assert('Should fail because its unable to read file');
		}
		catch (e) {
			assert(e);
		}
	});

	async function prepareVerify() {
		const issuerCertUrl = cred.certData.issuer.issuerCertUrl;
		assert(issuerCertUrl);
		const certName = issuerCertUrl.substring(issuerCertUrl.lastIndexOf('/') + 1);
		const pemPath = path.join(config.issuerCertsPath, `${certName.substring(0, certName.lastIndexOf('.'))}.pem`);
		assert(DirectoryServices.doesPathExists(pemPath));

		const req = ocspUtils.generateOcspRequest(cred.fqdn, cred.X509, pemPath);

		const CommonUtils = require('../../src/utils/CommonUtils');
		const AuthToken = require('../../src/services/AuthToken');

		const store = require("../../src/services/BeameStoreV2").getInstance();
		const fetchCredChainPromise = util.promisify(store.fetchCredChain.bind(store));
		let signerCred = null;
		try {
			let cred_options = {
				highestFqdn:null,
				allowRevoked:true,
				allowExpired:true,
				allowApprovers: true
			};
			const creds = await fetchCredChainPromise(cred.fqdn, cred_options);

			for (let i = 0; i < creds.length; i++) {
				if (creds[i].hasPrivateKey && !creds[i].expired && !creds[i].revoked) {
					signerCred = creds[i];
					break;
				}
			}
		}
		catch(err) {
			throw 'Failed to fetch cred chain: ' + err;
		}

		const digest    = CommonUtils.generateDigest(req.data, 'sha256', 'base64');
		const authToken = AuthToken.create(digest, signerCred);
		const ocspuri = await ocspUtils.getOcspUri(cred.X509);

		const url = `https://${config.SelectedProfile.OcspProxyFqdn}${config.ActionsApi.OcspApi.Check.endpoint}`;
		let opt = {
			url:      url,
			headers:  {
				'X-BeameAuthToken': authToken,
				'X-BeameOcspUri':   ocspuri,
				'Content-Type':     'application/ocsp-request',
				'Content-Length':   req.data.length
			},
			method:   'POST',
			body:     req.data,
			encoding: null
		};
		return { opt, req };
	}

	it('verify - good input', async () => {
		let { opt, req } = await prepareVerify();

		const request = util.promisify(require('request'));
		const response = await request(opt);
		assert(response && response.statusCode >= 200 && response.statusCode < 400);

		let status = await ocspUtils.verify(cred.fqdn, req, response.body);
		assert.equal(status, config.OcspStatus.Good);

		status = await ocspUtils.verify(null, req, response.body);
		assert.equal(status, config.OcspStatus.Good);
	});

	it('verify - unauthorized', async () => {
		let { opt, req } = await prepareVerify();
		opt.headers["X-BeameAuthToken"] = null;

		assert(req);
		const request = util.promisify(require('request'));
		const response = await request(opt);
		assert(response && response.statusCode === 401);

		const status = await ocspUtils.verify(cred.fqdn, req, response.body);
		assert.equal(status, config.OcspStatus.Unavailable);
	});


	it('verify - wrong input combinations', async () => {
		let { opt, req } = await prepareVerify();

		assert(req);
		const request = util.promisify(require('request'));
		const response = await request(opt);
		assert(response && response.statusCode >= 200 && response.statusCode < 400);

		let status = await ocspUtils.verify(cred.fqdn, null, response.body);
		assert.equal(status, config.OcspStatus.Unavailable);

		status = await ocspUtils.verify(cred.fqdn, req, null);
		assert.equal(status, config.OcspStatus.Unavailable);

		status = await ocspUtils.verify();
		assert.equal(status, config.OcspStatus.Unavailable);
	});
});