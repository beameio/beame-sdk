"use strict";

const util				= require('util');
const assert			= require('assert');
const ocsp              = require('ocsp');
const DirectoryServices = require('../services/DirectoryServices');
const BeameLogger       = require('./Logger');
const logger            = new BeameLogger("OcspUtil");
const OcspStatus        = (require('../../config/Config')).OcspStatus;

class ocspUtils {
	static _parseOcspResponse (res){
		return res && res.type && res.type == 'good' ? OcspStatus.Good : OcspStatus.Unavailable;
	}

	static generateOcspRequest(fqdn, x509, pemPath) {
		try {
			return ocsp.request.generate(x509, DirectoryServices.readFile(pemPath))
		} catch (e) {
			logger.error(`Generate ocsp request for ${fqdn} error ${BeameLogger.formatError(e)}`);
			return null;
		}
	}

	static async getOcspUri(x509) {
		assert(x509);
		return await util.promisify(ocsp.getOCSPURI)(x509);
	}

	static async check(fqdn, x509, pemPath) {
		const opt = {
			cert:   x509,
			issuer: DirectoryServices.readFile(pemPath)
		};

		try {
			const res = await util.promisify(ocsp.check)(opt);
			return ocspUtils._parseOcspResponse(res);
		} catch (e) {
			logger.error(`Ocsp check for ${fqdn} error ${BeameLogger.formatError(e)}`);
			return OcspStatus.Unavailable;
		}
	}

	static async verify(fqdn, req, res) {
		const opt = {
			request:  req,
			response: res
		};

		try {
			const res = await util.promisify(ocsp.verify)(opt);
			return ocspUtils._parseOcspResponse(res);
		} catch (e) {
			logger.error(`Ocsp verify for ${fqdn} error ${BeameLogger.formatError(e)}`);
			return OcspStatus.Unavailable;
		}
	}
}


module.exports = ocspUtils;