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

	static isResponseSuccess(statusCode){
		return statusCode >= 200 && statusCode < 300;
	}

	static getSequelizeBinaryPath(){
		const path = require('path');
		return  path.join(path.dirname(path.dirname(require.resolve('sequelize'))), '.bin', 'sequelize');
	}
}

module.exports = CommonUtils;
