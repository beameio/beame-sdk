/**
 * Created by zenit1 on 08/09/2016.
 */
"use strict";
const path     = require('path');
const exec     = require('child_process').exec;
const execFile = require('child_process').execFile;
const fs          = require('fs');

const CommonUtils = require('./CommonUtils');
const config      = require('../../config/Config');
const module_name = config.AppModules.OpenSSL;
const logger      = new (require('../utils/Logger'))(module_name);
const beameUtils  = require('../utils/BeameUtils');
const csrSubj     = "C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=";


class OpenSSLWrapper {

	getPublicKeySignature(dirPath, private_key_filename, public_key_filename) {

		const public_der_filename = 'public_key.der';

		const savePublicKeyDer = () => {
			return new Promise((resolve, reject) => {
					let pkFile = beameUtils.makePath(dirPath, public_key_filename);

					let action = "openssl",
					    args   = ['rsa', '-pubin', '-in', pkFile, '-outform', 'DER', '-out', path.join(dirPath, public_der_filename)];

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

		const savePublicKeySignature = () => {
			return new Promise((resolve, reject) => {
					let private_key    = path.join(dirPath, private_key_filename),
					    public_key_der = path.join(dirPath, public_der_filename),
					    temp_signature = path.join(dirPath, 'sign.sha256'),
					    signature      = path.join(dirPath, 'sign.txt');


					let action = "openssl",
					    args   = ['dgst', '-sha256', '-sign', private_key, '-out', temp_signature, public_key_der];

					try {
						execFile(action, args, function (error) {
							if (error) {
								reject(error);
								return;
							}

							//console.log('***************************public key signature sha256 saved***********************************');

							args = ['base64', '-in', temp_signature, '-out', signature];

							execFile(action, args, function (error) {
								if (error) {
									reject(error);
									return;
								}

								let sign = fs.readFileSync(signature, 'utf8');

								fs.unlink(public_key_der);
								fs.unlink(temp_signature);
								fs.unlink(signature);

								resolve(sign);
							});

						});
					}
					catch (e) {
						reject(e);
					}
				}
			);
		};

		return savePublicKeyDer().then(savePublicKeySignature);

	}

	savePublicKey (pkFile, pubFile) {
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

	createCSR(fqdn, pkFile) {
		return new Promise((resolve, reject) => {
			let errMsg,
			    cmd = "openssl req -key " + pkFile + " -new -subj \"/" + (csrSubj + fqdn) + "\"";
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

	createPKCS7Cert(dirPath) {
		let action = "openssl",
		    args   = ["crl2pkcs7", "-inform" , "PEM" , "-certfile", path.join(dirPath, config.CertFileNames.X509), "-certfile", path.join(dirPath, config.CertFileNames.BEAME_CA), "-certfile", path.join(dirPath, config.CertFileNames.CA_G2),"-certfile", path.join(dirPath, config.CertFileNames.CA), "-outform","PEM","-out",path.join(dirPath, config.CertFileNames.PKCS7),"-nocrl"];

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
		let pwd    = CommonUtils.randomPassword(),
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

}


module.exports = OpenSSLWrapper;