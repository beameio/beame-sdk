"use strict";

const ocsp              = require('ocsp');
const DirectoryServices = require('../services/DirectoryServices');
const BeameLogger       = require('./Logger');
const logger            = new BeameLogger("OcspUtil");
const OcspStatus        = (require('../../config/Config')).OcspStatus;


class ocspUtils {


	static _parseOcspResponse (err, res){
		if (err) {
			logger.warn(`Ocsp check for ${fqdn} error ${err}`);
			return OcspStatus.Bad;
		}
		else {
			return res && res.type && res.type == 'good' ? OcspStatus.Good : OcspStatus.Unavailable;
		}
	};

	static generateOcspRequest(fqdn, x509, pemPath) {
		try {
			return ocsp.request.generate(x509, DirectoryServices.readFile(pemPath))
		} catch (e) {
			logger.error(`Generate ocsp request for ${fqdn} error ${BeameLogger.formatError(e)}`);
			return null;
		}

	}

	static getOcspUri(x509) {
		return new Promise((resolve, reject) => {
				ocsp.getOCSPURI(x509, (err, uri) => {
					err ? reject(err) : resolve(uri)
				});
			}
		);

	}

	static check(fqdn, x509, pemPath) {
		return new Promise((resolve, reject) => {
				try {
					ocsp.check({
						cert:   x509,
						issuer: DirectoryServices.readFile(pemPath)
					}, (err, res) => {
						if (err) {
							logger.warn(`Ocsp check for ${fqdn} error ${err}`);
							reject(err);
						}
						else {
							res && res.type && res.type == 'good' ? resolve() : reject(res);
						}

					});
				} catch (e) {
					logger.error(`Ocsp check for ${fqdn} error ${BeameLogger.formatError(e)}`);
					reject(e);
				}
			}
		);
	}

	static checkOcspStatus(fqdn, x509, pemPath) {
		return new Promise((resolve) => {
				try {
					ocsp.check({
						cert:   x509,
						issuer: DirectoryServices.readFile(pemPath)
					}, (err, res) => {
						let status = ocspUtils._parseOcspResponse(err, res);
						resolve(status);

					});
				} catch (e) {
					logger.error(`Ocsp check for ${fqdn} error ${BeameLogger.formatError(e)}`);
					resolve(OcspStatus.Unavailable);
				}
			}
		);
	}

	static verify(fqdn, req, res) {
		return new Promise((resolve) => {
				try {
					ocsp.verify({
						request:  req,
						response: res
					}, (err, resp) => {
						let status = ocspUtils._parseOcspResponse(err, resp);
						resolve(status);
					});
				} catch (e) {
					logger.error(`Ocsp verify for ${fqdn} error ${BeameLogger.formatError(e)}`);
					resolve(OcspStatus.Unavailable);
				}
			}
		);

	}
}


module.exports = ocspUtils;