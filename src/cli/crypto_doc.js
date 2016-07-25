var crypto =require('./crypto');


/* function aesEncrypt(data)  */
/* AES encrypt generats an initiation vector is 128 bits or 16 bytes */
/* and a random cipher, 256 bits */ 
/*Ciphered  The function returns a Array 
/* [{AES256CBC: encrypted}, { IV:"base64"     sharedCipher: "base64" }] */

/* function aesDecrypt(data)  */
/* AES decrypt function is the exact reversal of aesEncrypt it accepts* /
/* and two element array [{AES256CBC: encrypted}, { IV:"base64"     sharedCipher: "base64" }] 
/* and returns cleartext*/

var ciphered = crypto.aesEncrypt("my data");
console.log("AES Ciphered Data %j", ciphered);
var deciphered = crypto.aesDecrypt(ciphered)
console.log("AES deciphered Data %j", deciphered);


//
// Get Public Key accepts a cert and return NodeRsa object for the RSA key read form the ASN1 parser
//
//

function getPublicKey(cert) 

// Out encrytion function creates a symmetric key, find the public key assosiated with the fqdn (can be non beame). Secures the symmetric AES cipher with the RSA encyption. 
// it records which FQDN it was encrypted for. therefore the decrypt function only recived the data buffer 
// it can take arbitry length data, longer than 215 byes (allowed by RSA encryption)

var asymetricallyEncrypted = crypto.encrypt("this is our arbitary length data", "qrncdoas1okei095.v1.beameio.net");
console.log("
/* function decrypt(data)  */data
/* function sign(data, fqdn)  */
/* function checkSignature(data, fqdn, signature)  */
