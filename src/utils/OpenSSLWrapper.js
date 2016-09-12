/**
 * Created by zenit1 on 08/09/2016.
 */
"use strict";
const path     = require('path');
const exec     = require('child_process').exec;
const execFile = require('child_process').execFile;


const config      = require('../../config/Config');
const module_name = config.AppModules.OpenSSL;
var logger        = new (require('../utils/Logger'))(module_name);
var csrSubj       = "C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=";


class OpenSSLWrapper {

	createPrivateKey() {
		return new Promise((resolve, reject) => {
			var errMsg;

			/* --------- generate RSA key: ------------------------------------------------*/
			var cmd = "openssl genrsa 2048";

			logger.debug("generating private key with", {"cmd": cmd});

			exec(cmd, function (error, stdout, stderr) {

				if (error !== null) {
					/* -------  put error handler to deal with possible openssl failure -----------*/
					errMsg = logger.formatErrorMessage("Failed to generate Private Key", module_name, {
						"error":  error,
						"stderr": stderr
					}, config.MessageCodes.OpenSSLError);

					reject(errMsg);
					return;
				}

				resolve(stdout);

			});

		});
	}

	createCSR(fqdn, pkFile) {
		return new Promise((resolve, reject) => {
			var errMsg;
			var cmd = "openssl req -key " + pkFile + " -new -subj \"/" + (csrSubj + fqdn) + "\"";
			logger.debug("generating CSR with", {"cmd": cmd});
			try {
				exec(cmd,
					/**
					 *
					 * @param error
					 * @param stdout => return CSR
					 * @param stderr
					 */
					function (error, stdout, stderr) {
						if (error !== null) {
							errMsg = logger.formatErrorMessage("Failed to generate CSR", module_name, {
								"error":  error,
								"stderr": stderr
							}, config.MessageCodes.OpenSSLError);
							reject(errMsg);
						}
						else {
							resolve(stdout);
						}
					});
			}
			catch (error) {
				errMsg = logger.formatErrorMessage("Create Developer CSR", module_name, error, config.MessageCodes.OpenSSLError);
				reject(errMsg);
			}
		});
	}

	createP7BCert(dirPath) {
		let action = "openssl",
		    args   = ["pkcs7", "-print_certs", "-in", path.join(dirPath, config.CertFileNames.PKCS7)];

		return new Promise((resolve, reject) => {
				try {
					execFile(action, args, function (error, stdout) {
						if (!error) {
							resolve(stdout);
						}
						else {
							reject(error);
						}
					});
				}
				catch (e) {
					reject(e.toString());
				}
			}
		);
	}

	createPfxCert(dirPath) {
		let pwd    = OpenSSLWrapper._randomPassword(),
		    action = "openssl",
		    args   = ["pkcs12", "-export", "-in", path.join(dirPath, config.CertFileNames.X509), "-certfile", path.join(dirPath, config.CertFileNames.CA), "-inkey", path.join(dirPath, config.CertFileNames.PRIVATE_KEY), "-password", "pass:" + pwd, "-out", path.join(dirPath, config.CertFileNames.PKCS12)];

		return new Promise((resolve, reject) => {
				try {
					execFile(action, args, function (error) {
						if (error) {
							reject(error);
							return;
						}
						resolve(pwd);
					});
				}
				catch (e) {
					reject(e);
				}
			}
		);

	}

	static _randomPassword(length) {
		var len   = length || 16;
		var chars = "abcdefghijklmnopqrstuvwxyz!@#$%^&*()-+<>ABCDEFGHIJKLMNOP1234567890";
		var pass  = "";
		for (var x = 0; x < len; x++) {
			var i = Math.floor(Math.random() * chars.length);
			pass += chars.charAt(i);
		}

		return pass;
	}

}


module.exports = OpenSSLWrapper;