/**
 * Created by zglozman on 9/7/16.
 */
'use strict'

const crypto = require('../../src/cli/crypto');
const BeameStore = require("../../src/services/BeameStoreV2");
const store = new BeameStore();

let credentials = store.list();

let crypted = crypto.encrypt("aksljlksadjklsadljk", credentials[1].fqdn);
let decrtped = crypto.decrypt(JSON.stringify(crypted ));;
let cryptedAndsigned = crypto.encrypt("aksljlksadjklsadljk", credentials[1].fqdn, credentials[1].fqdn);
let output =  crypto.decrypt(JSON.stringify(cryptedAndsigned));
let signature  = crypto.sign('asdasdasdasdasasasdsadsadsadasd', credentials[1].fqdn);
let result = crypto.checkSignature(signature.signedData, credentials[1].fqdn, signature.signature);
console.log('check signature status ',   result );
