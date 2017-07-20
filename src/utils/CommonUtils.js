/**
 * Created by zenit1 on 20/09/2016.
 */
"use strict";

class CommonUtils {

	static timeStamp() {
		function pad(n) {
			return n < 10 ? "0" + n : n;
		}

		let d     = new Date(),
		    dash  = "-",
		    colon = ":";

		return d.getFullYear() + dash +
			pad(d.getMonth() + 1) + dash +
			pad(d.getDate()) + " " +
			pad(d.getHours()) + colon +
			pad(d.getMinutes()) + colon +
			pad(d.getSeconds());
	}


	//noinspection JSUnusedGlobalSymbols
	static timeStampShort() {
		function pad(n) {
			return n < 10 ? "0" + n : n;
		}

		let d = new Date();

		return d.getFullYear() +
			pad(d.getMonth() + 1) +
			pad(d.getDate()) +
			pad(d.getHours()) +
			pad(d.getMinutes()) +
			pad(d.getSeconds());
	}

	static stringify(obj, format) {
		//noinspection NodeModulesDependencies,ES6ModulesDependencies
		return format ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
	}

	static parse(obj) {
		try {
			//noinspection NodeModulesDependencies,ES6ModulesDependencies
			return typeof obj == "object" ? obj : JSON.parse(obj);
		}
		catch (error) {
			console.error(`CommonUtils::parse - failed to parse data:`, error);
			return null;
		}

	}

	static randomPassword(length) {
		let len     = length || 16;
		const chars = "abcdefghijklmnopqrstuvwxyz!@#$%^&*()-+<>ABCDEFGHIJKLMNOP1234567890";
		let pass    = "";
		for (let x = 0; x < len; x++) {
			let i = Math.floor(Math.random() * chars.length);
			pass += chars.charAt(i);
		}

		return pass;
	}

	//noinspection JSUnusedGlobalSymbols
	static randomBytes(len) {
		const crypto = require('crypto');

		crypto.randomBytes(len || 256, (error, buf) => {
				if (error) {
					return null;
				}
				return buf.toString('hex');
			}
		);

	}

	/**
	 *
	 * @param {number|null} [upper]
	 * @returns {number}
	 */
	static randomTimeout(upper) {
		return Math.floor((Math.random() * (upper || 10)) + 1) * 1000 * Math.random()
	}

	static addDays(date, days) {
		let result = new Date(date || new Date());
		result.setDate(result.getDate() + days);
		return result;
	}

	/**
	 *
	 * @param data
	 * @param {String|null} [alg] => hash algorithm
	 * @param {String|null} [dig] => hash digest
	 * @returns {*}
	 */
	static generateDigest(data, alg, dig) {
		let str = CommonUtils.isObject(data) ? CommonUtils.stringify(data, false) : data;
		return require('crypto').createHash(alg || 'sha256').update(str).digest(dig || 'hex');
	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 * @param {Object} obj
	 * @returns {boolean}
	 */
	static isObjectEmpty(obj) {
		return Object.keys(obj).length === 0;
	}

	static isObject(obj) {
		return typeof obj === 'object';
	}

	static promise2callback(promise, callback) {
		if (!callback) {
			return;
		}
		promise
			.then(data => callback(null, data))
			.catch(error => callback(error, null));
	}

	//noinspection JSUnusedGlobalSymbols
	static filterHash(obj, predicate) {
		let ret = {};
		for (let k in obj) {
			//noinspection JSUnfilteredForInLoop
			let v = obj[k];//noinspection JSUnfilteredForInLoop
			if (predicate(k, v)) {//noinspection JSUnfilteredForInLoop
				ret[k] = v;
			}
		}
		return ret;
	}

	static isResponseSuccess(statusCode) {
		return statusCode >= 200 && statusCode < 300;
	}

	static getSequelizeBinaryPath(sequelizeModule) {
		const path = require('path');
		return path.join(path.dirname(path.dirname(sequelizeModule)), '.bin', 'sequelize');
	}

	//noinspection JSUnusedGlobalSymbols
	static runSequilizeCmd(sequelizeModule, args, dirname) {
		const os       = require('os');
		const execFile = require('child_process').execFile;
		const path     = require('path');

		const _commonSequelizeArgs = () => {
			let result = [];
			['migrations', 'seeders', 'models'].forEach(what => {
				result.push(`--${what}-path`);
				result.push(path.join(dirname, what));
			});
			return result;
		};

		args.splice.apply(args, [1, 0].concat(_commonSequelizeArgs()));

		return new Promise((resolve, reject) => {

			if (os.platform() == 'win32') {

				let cmdArgs = ["/c", this.getSequelizeBinaryPath(sequelizeModule)],
				    allArgs = cmdArgs.concat(args);


				execFile('cmd', allArgs, (error) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			}
			else {

				execFile(this.getSequelizeBinaryPath(sequelizeModule), args, (error) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			}
		});
	}

	/**
	 * @param {Number|null|undefined} [fuzz] in seconds
	 * @param retries
	 */
	static validateMachineClock(fuzz,retries = 3) {


		return new Promise((resolve) => {
			const onGotTime = (remoteTime)=>{
				const defaultClockFuzz = require('../../config/Config').defaultAllowedClockDiff;
				let diff = Math.abs(Date.now()/1000) - remoteTime;
				let isTimeValid = diff <= (fuzz || defaultClockFuzz);
				if(!isTimeValid)
					console.warn(`Machine clock incorrect, diff vs ntp is ${diff} seconds, installation may fail due to timing issue`);
				resolve()
			};

			const getGlobalNtpStamp = (retries) =>{
				const ntpClient        = require('ntp-client');
				ntpClient.getNetworkTime("pool.ntp.org", 123, (err, date) => {
					if (err) {

						if(retries == 0){
							console.error(err);
							resolve();
							return;
						}

						retries--;

						return CommonUtils.validateMachineClock(fuzz,retries);
					}

					onGotTime(Math.abs(date.getTime()/1000));

				});
			};


			if (process.env.EXTERNAL_OCSP_FQDN) {
				const apiConfig = require('../../config/ApiConfig.json');
				const ProvisionApi           = require('../services/ProvisionApi');
				const url = `https://${process.env.EXTERNAL_OCSP_FQDN}${apiConfig.Actions.OcspApi.Time.endpoint}`;

				const request = require('request');

				let opt = {
					url:      url,
					method:   'GET',
				};

				request(opt, (error, response, body) => {
					if (response.statusCode < 200 || response.statusCode >= 400) {
						console.warn('Failed to get unix time:',error);
						getGlobalNtpStamp(1);
						// resolve();
					}
					else {
						onGotTime(Number(body));
					}
				});
			}
			else{
				getGlobalNtpStamp(retries);
			}

			}
		);


	}

	static escapeXmlString(str){
		return str.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');

	}
}

module.exports = CommonUtils;
