var beameCrypro = require('../crypto.js');
var creds = require('../creds.js');


// AES symmetric tests 
//
//
creds.importCredentials("", "./creds");
/*
var cryptoMessage= beameCrypro.aesEncrypt("huj vam");
console.log(beameCrypro.aesDecrypt(cryptoMessage));

var rsaEncyptedBuffes = beameCrypro.encrypt("huj vam ^^^^^^^^^^^^^^^#2", 'mlue37ul202ncwo0.n738spsixxbhov4d.v1.beameio.net');
console.log(beameCrypro.decrypt(rsaEncyptedBuffes ));

var signature = beameCrypro.sign("HUJVAM^^^^^^^^^^3", "ysntlrp128tm0dvi.v1.r.d.edge.eu-central-1a-1.v1.beameio.net");
if(beameCrypro.checkSignature("HUJVAM^^^^^^^^^^3", "ysntlrp128tm0dvi.v1.r.d.edge.eu-central-1a-1.v1.beameio.net", signature) == false){
    console.error("Test failed, sigs dont match ")
}else{
    console.log("signing test succeeded ")
}


var exportedCreds = creds.exportCredentials('nc6qd6e6w0vd8hw5.v1.beameio.net', 'n738spsixxbhov4d.v1.beameio.net');

*/