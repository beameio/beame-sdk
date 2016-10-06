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
			return null;
		}

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
	 * @param data
	 * @param {String|null} [alg] => hash algorithm
	 * @param {String|null} [dig] => hash digest
	 * @returns {*}
	 */
	static generateDigest(data,alg,dig) {
		let str = CommonUtils.isObject(data) ? CommonUtils.stringify(data, false) : data;
		return require('crypto').createHash(alg || 'sha256').update(str).digest(dig || 'hex');
	}

	static isObject(obj) {
		return typeof obj === 'object';
	}

	static promise2callback(promise, callback) {
		if(!callback) {
			return;
		}
		promise
			.then(data => callback(null, data))
			.catch(error => callback(error, null));
	}
}

module.exports = CommonUtils;
