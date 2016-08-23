/* The general simple http public key pinning explanation for merere mortals.
 * We convert the public key to a proper DER notation, with header exponent, and modulus, 
 * then we preform a SHA256 on it, and the sha is what goes in the header. 
 * Here we offer high level funcitons for the creation of http public key headers from x509. 
 * We will use existing x509 parse cert function that is located in crypto js. 
 *
 *
 */


var x509 = require('x509');
var store = require("../services/BeameStore")();

function getPublicKeyEncodedDer(cert) {
	var xcert = x509.parseCert(cert + "");
	if (xcert) {
		var publicKey = xcert.publicKey;
		var modulus = new Buffer(publicKey.n, 'hex');
		var header = new Buffer("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA", "base64");
		var midheader = new Buffer("0203", "hex");
		var exponent = new Buffer("010001", "hex");
		var buffer = Buffer.concat([header, modulus, midheader, exponent]);
		return buffer;
	}
	return {};
}

function getCertificate  (fqdn){
	var element = store.search(fqdn)[0];
	if (element) {
		certBody = element.X509 + "";
	}
	else {
		certBody = store.getRemoteCertificate(fqdn) + "";
	}
	return certBody;
};

var getHashForCert = function(cert){

};

function createPublicKeyPinningHeader(edgeFqdn, pinAtom, pinDeveloper){
	var edge = store.search(edgeFqdn)[0];
	var edgeCertKeyDer= getPublicKeyEncodedDer(edge.X509);
	var atomCertDer  = getPublicKeyEncodedDer(getCertificate(edge.parent_fqdn));


	var edgeHash = require('crypto').createHash('sha256').update(edgeCertKeyDer).digest("base64");
	var atomHash = require('crypto').createHash('sha256').update(atomCertDer).digest("base64");
	//console.log(edgeHash);
	return 'pin-sha256="' + edgeHash + '";pin-sha256="'+ atomHash +'"; max-age=315000';

};

module.exports = {
	createPublicKeyPinningHeader,
	getCertificate
}
