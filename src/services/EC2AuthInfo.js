'use strict';

const request       = require('request');
const child_process = require('child_process');
const CommonUtils   = require('../utils/CommonUtils');

const URLS = {
	doc: 'http://169.254.169.254/latest/dynamic/instance-identity/document',
	sig: 'http://169.254.169.254/latest/dynamic/instance-identity/pkcs7',
};

class EC2AuthInfo {

	/**
	 * @returns {Promise.<String>}
	 */
	get() {
		let ret = {};
		return new Promise((resolve, reject) => {
			let outstandingRequestsCount = Object.keys(URLS).length;
			for (let k in URLS) {
				request(URLS[k], (error, response, body) => {
					if (error) {
						reject(error);
						return;
					}
					if (response.statusCode != 200) {
						reject(`Got invalid response code for URL ${URLS[k]}`);
						return;
					}
					ret[k] = body;
					outstandingRequestsCount--;
					if (outstandingRequestsCount == 0) {
						ret.sig = `-----BEGIN PKCS7-----\n${ret.sig}\n-----END PKCS7-----\n`;
						resolve(CommonUtils.stringify(ret, false));
					}
				})
			}
		});
	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 * @returns {Promise.<Boolean>}
	 */
	validate(info) {
		return new Promise((resolve, reject) => {
			const path = require('path');
			child_process.execFile(path.join(__dirname, 'validate-ec2-auth-data.ngs'), [info], (error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(true);
			});
		});
	}
}

module.exports = EC2AuthInfo;
