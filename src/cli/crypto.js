"use strict";
/*### sign the data in testFIle with a key
 openssl rsautl -sign -in ./test -inkey ../../.beame/oxxmrzj0qlvsrt1h.v1.beameio.net/private_key.pem -out sig

 #decrypt and verify

 openssl rsautl -verify -inkey mykey.pub -in sig -pubin

 #extract public key from certificate
 openssl x509 -pubkey -noout -in ../../.beame/oxxmrzj0qlvsrt1h.v1.beameio.net/x509.pem > pubkey.pem*/

var NodeRsa = require("node-rsa");
var config              = require('../../config/Config');
const module_name         = config.AppModules.BeameCrypto;
var logger              = new (require('../utils/Logger'))(module_name);

var BeameStore = require("../services/BeameStore");
var store      = new BeameStore();

require('../../initWin');
var x509       = require("x509");

function aesEncrypt(data) {
	var crypto               = require('crypto');
	var sharedSecret         = crypto.randomBytes(32); // should be 128 (or 256) bits
	var initializationVector = crypto.randomBytes(16); // IV is always 16-bytes
	var cipher               = crypto.Cipheriv('aes-256-cbc', sharedSecret, initializationVector);
	var encrypted            = cipher.update(data, 'utf8', 'base64');
	encrypted += cipher.final('base64');

	return [{AES256CBC: encrypted}, {
		IV:           initializationVector.toString('base64'),
		sharedCipher: sharedSecret.toString('base64')
	}];

}

function aesDecrypt(data) {
	//data = JSON.parse(data);
	var crypto = require('crypto');
	if (!(data[1].IV && data[1].sharedCipher && data[0].AES256CBC )) {
		return "";
	}
	var cipher = new Buffer(data[1].sharedCipher, "base64");
	var IV     = new Buffer(data[1].IV, "base64");

	var decipher = crypto.createDecipheriv("aes-256-cbc", cipher, IV);
	var dec      = decipher.update(data[0].AES256CBC, 'base64', 'utf8');
	dec += decipher.final('utf8');
	return dec;
}

function getPublicKey(cert) {
	var xcert = x509.parseCert(cert + "");
	if (xcert) {
		var publicKey = xcert.publicKey;
		var modulus   = new Buffer(publicKey.n, 'hex');
		var header    = new Buffer("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA", "base64");
		var midheader = new Buffer("0203", "hex");
		var exponent  = new Buffer("010001", "hex");
		var buffer    = Buffer.concat([header, modulus, midheader, exponent]);
		var rsaKey    = new NodeRsa(buffer, "public-der");
		rsaKey.importKey(buffer, "public-der");
		return rsaKey;
	}
	return {};
}

function encrypt(data, fqdn) {
	var element = store.search(fqdn)[0];
	if (element) {
		var rsaKey = getPublicKey(element.X509);
		if (rsaKey) {

			var sharedCiphered         = aesEncrypt(data);
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			var symmetricCipherElement = JSON.stringify(sharedCiphered[1]);
			sharedCiphered[1]          = "";

			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			return {
				rsaCipheredKeys: rsaKey.encrypt(JSON.stringify(symmetricCipherElement), "base64", "utf8"),
				data:            sharedCiphered[0],
				encryptedFor:    fqdn
			};
		}
	}
}

function decrypt(data) {
	try {
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		var encryptedMessage = JSON.parse(data);
		if (!encryptedMessage.encryptedFor) {
			logger.fatal("Decrypting a wrongly formatted message", data);
		}
		var element = store.search(encryptedMessage.encryptedFor)[0];
		if (!element && !(element.PRIVATE_KEY)) {
			logger.fatal(`private key for ${encryptedMessage.encryptedFor}`);
		}
		var rsaKey = new NodeRsa(element.PRIVATE_KEY, "private");

		var message = rsaKey.decrypt(encryptedMessage.rsaCipheredKeys) + " ";
		//noinspection ES6ModulesDependencies,NodeModulesDependencies
		var payload = JSON.parse(JSON.parse(message));

		var dechipheredPayload = aesDecrypt([
			encryptedMessage.data,
			payload,
		]);
		if (!message) {
			logger.fatal("Decrypting, No message");
		}
	} catch (e) {
		logger.fatal("decrypt error ", e);
	}
	return dechipheredPayload;
}

function sign(data, fqdn) {
	var element = store.search(fqdn)[0];
	if (element) {
		var rsaKey = new NodeRsa(element.PRIVATE_KEY, "private");
		logger.info(`signing using ${fqdn}`);
		return rsaKey.sign(data, "base64", "utf8");
	}
	logger.error("public key not found ");
	return {};
}

function checkSignature(data, fqdn, signature) {
	var elemenet = store.search(fqdn)[0];
	var certBody;

	if (elemenet) {
		certBody = elemenet.X509 + "";
	}
	else {
		certBody = store.getRemoteCertificate(fqdn) + "";
	}

	var rsaKey = getPublicKey(certBody);
	var status = rsaKey.verify(data, signature, "utf8", "base64");
	logger.info(`signing status is ${status} ${fqdn}`);
	return status;
}

module.exports = {
	encrypt,
	decrypt,
	sign,
	checkSignature,
	aesEncrypt,
	aesDecrypt
};
