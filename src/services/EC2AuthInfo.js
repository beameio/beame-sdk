'use strict';

const request = require('request');
const child_process = require('child_process');

const URLS = {
	doc: 'http://169.254.169.254/latest/dynamic/instance-identity/document',
	sig: 'http://169.254.169.254/latest/dynamic/instance-identity/pkcs7',
};

class EC2AuthInfo {

	/**
	 * @returns {Promise.<String>}
	 */
	get() {
		var ret = {};
		return new Promise((resolve, reject) => {
			var outstandingRequestsCount = Object.keys(URLS).length;
			for(let k in URLS) {
				request(URLS[k], (error, response, body) => {
					if(error) {
						reject(error);
						return;
					}
					if(response.statusCode != 200) {
						reject(`Got invalid response code for URL ${URLS[k]}`);
						return;
					}
					ret[k] = body;
					outstandingRequestsCount--;
					if(outstandingRequestsCount == 0) {
						ret.sig = `-----BEGIN PKCS7-----\n${ret.sig}\n-----END PKCS7-----\n`;
						resolve(JSON.stringify(ret));
						return;
					}
				})
			}
		});
	}

	/**
	 * @returns {Promise.<Boolean>}
	 */
	validate(info) {
		return new Promise((resolve, reject) => {
			const path = require('path');
			child_process.execFile(path.join(__dirname, 'validate-ec2-auth-data.ngs'), [info], (error, stdout, stderr) => {
				if(error) {
					reject(error);
					return;
				}
				if(stderr !== 'Verification successful\n') {
					reject(`Unexpected value in stderr: ${stderr}`);
					return;
				}
				resolve(true);
				// console.log('E=%j O=%j E=%j', error, stdout, stderr)
			});
		});
	}
}

module.exports = {
	EC2AuthInfo
};
