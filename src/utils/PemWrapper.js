const logger = new (require('./Logger'))("PemWrapper");

const Module = require('module');
const fs = require('fs');
const which = require('which');
const childProcess = require('child_process');

const originalRequire = Module.prototype.require;
const originalSpawn = childProcess.spawn;

class PemWrapper {
	constructor() {
		if (PemWrapper.instance) {
			return PemWrapper.instance;
		}
		PemWrapper.instance = this;

		this._makeSync();
		this.realPem = require('pem');
	}

	readCertificateInfo(certificate, cb) {
		return this.realPem.readCertificateInfo(certificate, cb)
	}
	getPublicKey(certificate, cb) {
		return this.realPem.getPublicKey(certificate, cb)
	}
	createPkcs12 (key, certificate, password, options, callback) {
		return this.realPem.createPkcs12(key, certificate, password, options, callback);
	}

	_makeSync() {
		function whichOverride(cmd, cb) {
			try {
				const result = which.sync(cmd);
				cb(null, result)
			} catch (e) {
				cb(e)
			}
		}

		function unlinkOverride(path, callback) {
			try {
				fs.unlinkSync(path);
				callback()
			} catch (e) {
				callback(e)
			}
		}

		function spawnOverride(command, args, options) {
			if (command !== 'openssl') {
				return originalSpawn(command, args, options)
			}

			let out = null;
			let err = null;
			try {
				out = childProcess.spawnSync(command, args, options)
			} catch (e) {
				err = e
			}

			return {
				stdout: {
					on: function (eventName, callback) {
						if (eventName !== 'data') {
							throw new Error('Stdout.on called with unknown event ' + eventName)
						}
						if (out.stdout) callback(out.stdout)
					}
				},
				stderr: {
					on: function (eventName, callback) {
						if (eventName !== 'data') {
							throw new Error('Strerr.on called with unknown event ' + eventName)
						}
						if (out.stderr) callback(out.stderr)
					}
				},
				on: function (eventName, callback) {
					switch (eventName) {
						case 'error':
							if (err) callback(err);
							break;
						case 'close':
						case 'exit':
							callback();
							break;
						default:
							throw new Error('on called with unknown event ' + eventName)
					}
				}
			}
		}

		Module.prototype.require = function (cmd) {
			if (this.filename.includes('pem/lib/openssl.js')) {
				switch (cmd) {
					case 'which':
						logger.debug('Overriding which for ' + this.filename);
						return whichOverride;
					case 'child_process': {
						logger.debug('Overriding child_process.spawn for ' + this.filename);
						const childProcess = originalRequire.apply(this, arguments);
						childProcess.spawn = spawnOverride;
						return childProcess;
					}
					case 'fs': {
						logger.debug('Overriding fs.unlink for ' + this.filename);
						const fs = originalRequire.apply(this, arguments);
						fs.unlink = unlinkOverride;
						return fs;
					}
				}
			}
			return originalRequire.apply(this, arguments);
		}
	}
}

module.exports = PemWrapper;
