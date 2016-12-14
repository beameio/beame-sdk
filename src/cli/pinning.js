/* *Work-in-progress*
 * The general simple http public key pinning explanation for merere mortals.
 * We convert the public key to a proper DER notation, with header exponent, and modulus,
 * then we preform a SHA256 on it, and the sha is what goes in the header.
 * Here we offer high level funcitons for the creation of http public key headers from x509.
 * We will use existing x509 parse cert function that is located in crypto js.
 */

const x509 = require('x509');
const store = require("../services/BeameStoreV2")();

function getPublicKeyEncodedDer(cert) {
	let xcert = x509.parseCert(cert + "");
	if (xcert) {
		let publicKey = xcert.publicKey,
		    modulus = new Buffer(publicKey.n, 'hex'),
		    header = new Buffer("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA", "base64"),
		    midheader = new Buffer("0203", "hex"),
		    exponent = new Buffer("010001", "hex");
		return Buffer.concat([header, modulus, midheader, exponent]);
	}
	return {};
}

function getCertificate  (fqdn){
	let element = store.search(fqdn)[0],
	    certBody;
	if (element) {
		certBody = element.X509 + "";
	}
	else {
		certBody = store.getRemoteCreds(fqdn) + "";
	}
	return certBody;
}


function createPublicKeyPinningHeader(edgeFqdn){
	let edge = store.search(edgeFqdn)[0],
	    edgeCertKeyDer= getPublicKeyEncodedDer(edge.X509),
	    atomCertDer  = getPublicKeyEncodedDer(getCertificate(edge.parent_fqdn));


	let edgeHash = require('crypto').createHash('sha256').update(edgeCertKeyDer).digest("base64"),
	    atomHash = require('crypto').createHash('sha256').update(atomCertDer).digest("base64");
	//console.log(edgeHash);
	return 'pin-sha256="' + edgeHash + '";pin-sha256="'+ atomHash +'"; max-age=315000';

}

module.exports = {
	createPublicKeyPinningHeader,
	getCertificate
};
