/**
 * Created by zenit1 on 03/07/2016.
 */
var path = require('path');
require('../../src/utils/Globals');
var devPath = global.devPath;

var store = new (require('../../src/services/BeameStore'))();

store.shredCredentials('hhbp9s5izoqhd20q.v1.beameio.net',function(){
    "use strict";
    console.log(arguments);
});

// rimraf('./temp', function(err) {
//     if (err) { throw err; }
//     // done
//     console.log('done');
// });

// dataServices.renameFile('./', 'b', 'a',function(error){
//     if(!error){
//         process.exit(0);
//     }
//     else{
//         process.exit(1);
//     }
// });