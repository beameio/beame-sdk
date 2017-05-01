/**
 * Created by zenit1 on 08/09/2016.
 */
"use strict";
const path     = require('path');
const exec     = require('child_process').exec;
const execFile = require('child_process').execFile;
const fs       = require('fs');

const CommonUtils = require('./CommonUtils');
const config      = require('../../config/Config');
const module_name = config.AppModules.OpenSSL;
const logger      = new (require('../utils/Logger'))(module_name);
//const csrSubj     = "C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=";


class OpenSSLWrapper {

	static getPublicKeySignature(pk) {

		try {
			const NodeRSA   = require('node-rsa');
			let key         = new NodeRSA(pk),
			      publicDer = key.exportKey('pkcs8-public-der'),
			      signature = key.sign(publicDer, 'base64', '');

			return Promise.resolve(signature);
		} catch (e) {
			return Promise.reject(e);
		}
	}

	savePublicKey(pkFile, pubFile) {
		return new Promise((resolve, reject) => {

				let action = "openssl",
				    args   = ['rsa', '-in', pkFile, '-pubout', '-out', pubFile];

				try {
					execFile(action, args, function (error) {
						if (error) {
							reject(error);
							return;
						}
						resolve();

					});
				}
				catch (e) {
					reject(e);
				}
			}
		);
	};

	createPrivateKey() {
		return new Promise((resolve, reject) => {
			let errMsg;

			/* --------- generate RSA key: ------------------------------------------------*/
			const cmd = "openssl genrsa 2048";

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

	createPfxCert(dirPath,password) {
		let pwd    = password || CommonUtils.randomPassword(),
		    action = "openssl",
		    args   = ["pkcs12", "-export", "-in", path.join(dirPath, config.CertFileNames.P7B), "-inkey", path.join(dirPath, config.CertFileNames.PRIVATE_KEY), "-password", "pass:" + pwd, "-out", path.join(dirPath, config.CertFileNames.PKCS12)];


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

	static convertCertToPem(derPath,pemPath){
			let action = "openssl",
			    args   = ["x509", "-inform", "der", "-in", derPath, "-out" , pemPath];

			return new Promise((resolve, reject) => {
					try {
						execFile(action, args, function (error) {
							error ? reject(error) : resolve();
						});
					}
					catch (e) {
						reject(e);
					}
				}
			);
	}

	// createCSR(fqdn, pkFile) {
	// 	return new Promise((resolve, reject) => {
	// 		let errMsg,
	// 		    cmd = "openssl req -key " + pkFile + " -new -subj \"/" + (csrSubj + fqdn) + "\"";
	// 		logger.debug("generating CSR with", {"cmd": cmd});
	// 		try {
	// 			exec(cmd,
	// 				/**
	// 				 *
	// 				 * @param error
	// 				 * @param stdout => return CSR
	// 				 * @param stderr
	// 				 */
	// 				function (error, stdout, stderr) {
	// 					if (error !== null) {
	// 						errMsg = logger.formatErrorMessage("Failed to generate CSR", module_name, {
	// 							"error":  error,
	// 							"stderr": stderr
	// 						}, config.MessageCodes.OpenSSLError);
	// 						reject(errMsg);
	// 					}
	// 					else {
	// 						resolve(stdout);
	// 					}
	// 				});
	// 		}
	// 		catch (error) {
	// 			errMsg = logger.formatErrorMessage("Create Developer CSR", module_name, error, config.MessageCodes.OpenSSLError);
	// 			reject(errMsg);
	// 		}
	// 	});
	// }
	//
	// createP7BCert(dirPath) {
	// 	let action = "openssl",
	// 	    args   = ["pkcs7", "-print_certs", "-in", path.join(dirPath, config.CertFileNames.PKCS7)];
	//
	// 	return new Promise((resolve, reject) => {
	// 			try {
	// 				execFile(action, args, function (error, stdout) {
	// 					if (!error) {
	// 						resolve(stdout);
	// 					}
	// 					else {
	// 						reject(error);
	// 					}
	// 				});
	// 			}
	// 			catch (e) {
	// 				reject(e.toString());
	// 			}
	// 		}
	// 	);
	// }
	//
	// createPKCS7Cert(dirPath) {
	// 	let action = "openssl",
	// 	    args   = ["crl2pkcs7", "-inform", "PEM", "-certfile", path.join(dirPath, config.CertFileNames.X509), "-certfile", path.join(dirPath, config.CertFileNames.BEAME_CA), "-certfile", path.join(dirPath, config.CertFileNames.CA_G2), "-certfile", path.join(dirPath, config.CertFileNames.CA), "-outform", "PEM", "-out", path.join(dirPath, config.CertFileNames.PKCS7), "-nocrl"];
	//
	// 	return new Promise((resolve, reject) => {
	// 			try {
	// 				execFile(action, args, function (error, stdout) {
	// 					if (!error) {
	// 						resolve(stdout);
	// 					}
	// 					else {
	// 						reject(error);
	// 					}
	// 				});
	// 			}
	// 			catch (e) {
	// 				reject(e.toString());
	// 			}
	// 		}
	// 	);
	// }
}


module.exports = OpenSSLWrapper;