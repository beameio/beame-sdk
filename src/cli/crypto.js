
/*### sign the data in testFIle with a key 
openssl rsautl -sign -in ./test -inkey ../../.beame/oxxmrzj0qlvsrt1h.v1.beameio.net/private_key.pem -out sig

#decrypt and verify 

openssl rsautl -verify -inkey mykey.pub -in sig -pubin

#extract public key from certificate 
openssl x509 -pubkey -noout -in ../../.beame/oxxmrzj0qlvsrt1h.v1.beameio.net/x509.pem > pubkey.pem*/

var NodeRsa = require("node-rsa");

var BeameStore = require("../services/BeameStore");
var store = new BeameStore();
var x509 = require("x509");

function aesEncrypt(data){
	var crypto = require('crypto');
	var sharedSecret = crypto.randomBytes(32); // should be 128 (or 256) bits
	var initializationVector = crypto.randomBytes(16); // IV is always 16-bytes
	cipher = crypto.Cipheriv('aes-256-cbc', sharedSecret, initializationVector);
	var encrypted = cipher.update(data, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	
	return [{ AES256CBC: encrypted },{IV:  initializationVector.toString('base64'), sharedCipher: sharedSecret.toString('base64')}];

}

function aesDecrypt(data){
	//data = JSON.parse(data);
	var crypto = require('crypto');
	if(!(data[1].IV && data[1].sharedCipher && data[0].AES256CBC )){
		return "";
	}
	var cipher  = new Buffer(data[1].sharedCipher, "base64");
	var IV = new Buffer(data[1].IV, "base64");

	decipher = crypto.createDecipheriv("aes-256-cbc", cipher, IV);
	var dec = decipher.update(data[0].AES256CBC,'base64','utf8');
	dec += decipher.final('utf8');
	return dec;
}

function getPublicKey(cert){
	var xcert = x509.parseCert(cert + "");
	if(xcert) {
		var publicKey = xcert.publicKey;
		var modulus = new Buffer(publicKey.n, 'hex');
		var header = new Buffer("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA", "base64");
		var midheader = new Buffer("0203", "hex");
		var exponent = new Buffer("010001", "hex");
		var buffer = Buffer.concat([header, modulus, midheader, exponent]);
		var rsaKey = new NodeRsa(buffer, "public-der");
		rsaKey.importKey(buffer, "public-der");
		return rsaKey
	}
	return {};
}

function encrypt(data, fqdn){
	var elemenet = store.search(fqdn)[0];
	if(elemenet){
		var rsaKey = getPublicKey(elemenet.X509);
		if(rsaKey ){

			var sharedCiphered = aesEncrypt(data);
			var symetricCipherElemenet = JSON.stringify(sharedCiphered[1]);
			sharedCiphered[1] = "";

			var message=  {
					rsaCipheredKeys: rsaKey.encrypt(JSON.stringify(symetricCipherElemenet), "base64", "utf8"),
					data: sharedCiphered[0], 
					encryptedFor: fqdn
			};

			return JSON.stringify(message);
		}
	}
}

function decrypt(data){
	try{ 
		var encryptedMessage  = JSON.parse(data);
		console.log("Encrypted Message", encryptedMessage);
		if(!encryptedMessage.encryptedFor){
			console.error("Decrypting a wrongly formated message %j", data);
			return -1;
		}	
		var elemenet = store.search(encryptedMessage.encryptedFor)[0];
		if(!elemenet && !(elemenet.PRIVATE_KEY)){
			console.error("private key for ", encryptedMessage.encryptedFor);
			return -1;
		}
		var rsaKey = new NodeRsa(elemenet.PRIVATE_KEY, "private");

		var message =rsaKey.decrypt(encryptedMessage.rsaCipheredKeys) + " ";
			var payload = JSON.parse(JSON.parse(message));

		var dechipheredPayload = aesDecrypt([
			encryptedMessage.data,
			payload,
		]);
		if(!message){
			return -1;
		}
	}catch(e){
		console.error("decrypt error ", e.toString());
	}
};

function sign(data, fqdn){
	var elemenet = store.search(fqdn)[0];
	if(elemenet) {
		var rsaKey = new NodeRsa(elemenet.PRIVATE_KEY, "private");
		return rsaKey.sign(data, "base64", "utf8");
	}
	console.error("public key not found ");
	return {};
}

function checkSignature(data, fqdn, signature){
	var elemenet = store.search(fqdn)[0];

	if(elemenet) {
		var rsaKey = getPublicKey(elemenet.X509);
		return rsaKey.verify(data, signature, "utf8", "base64");
	}else{
		var certBody = store.getRemoteCertificate(fqdn) + "";
		var rsaKey = getPublicKey(certBody);
		var status = rsaKey.verify(data, signature, "utf8", "base64");
		return status;
	}
}

module.exports = {
	encrypt: encrypt,
	decrypt: decrypt,
	sign: sign,
	checkSignature: checkSignature,
	aesEncrypt: aesEncrypt,
	aesDecrypt: aesDecrypt
};
