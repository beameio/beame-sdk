
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


function encrypt(data, fqdn){
	var elemenet = store.search(fqdn)[0];
	if(elemenet){
		var xcert = x509.parseCert(elemenet.X509 + "");
		if(xcert){
			var publicKey = xcert.publicKey;
			var modulus = new Buffer(publicKey.n, 'hex');
			var header = new Buffer("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA", "base64");
			var midheader = new Buffer("0203", "hex");
			var exponent = new Buffer("010001", "hex");
			var buffer = Buffer.concat([header, modulus, midheader, exponent]);
			var rsaKey = new NodeRsa(buffer, "public-der");
			rsaKey.importKey(buffer, "public-der");
			var encryptedData = rsaKey.encrypt(data, "base64", "utf8");
			return encryptedData;
		}
	}
}

function decrypt(fqdn, data){
	var elemenet = store.search(fqdn)[0];
	if(elemenet) {
		var rsaKey = new NodeRsa(elemenet.PRIVATE_KEY, "private");
		return (rsaKey.decrypt(data) + "");
	}

}

function sign(data, fqdn){
	var elemenet = store.search(fqdn)[0];
	if(elemenet) {
		var rsaKey = new NodeRsa(elemenet.PRIVATE_KEY, "private");
		return rsaKey.sign(data, "base64", "utf8");
	}
	return data;
}

function checkSignature(fqdn, data, signature){
	var elemenet = store.search(fqdn)[0];
	if(elemenet) {
		var rsaKey = new NodeRsa(elemenet.PRIVATE_KEY, "private");
		return rsaKey.verify(data, signature, "utf8", "base64");
	}
}

module.exports = {
	encrypt: encrypt,
	decrypt: decrypt,
	sign: sign,
	checkSignature: checkSignature
};
