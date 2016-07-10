
/*### sign the data in testFIle with a key 
openssl rsautl -sign -in ./test -inkey ../../.beame/oxxmrzj0qlvsrt1h.v1.beameio.net/private_key.pem -out sig

#decrypt and verify 

openssl rsautl -verify -inkey mykey.pub -in sig -pubin

#extract public key from certificate 
openssl x509 -pubkey -noout -in ../../.beame/oxxmrzj0qlvsrt1h.v1.beameio.net/x509.pem > pubkey.pem*/


function encrypt(data, fqdn){

}

function decrypt(fqdn){

}

function sign(fqdn){

}

function checkSignature(fqdn){

}

module.exports = {
	encrypt: encrypt,
	decrypt: decrypt,
	sign: sign,
	checkSignature: checkSignature
};
