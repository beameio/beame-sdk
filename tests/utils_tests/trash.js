/**
 * Created by zenit1 on 03/07/2016.
 */
var path = require('path');
var os = require('os');
var home = os.homedir();
var devPath = path.join(home ,".beame/");              //path to store dev data: uid, hostname, key, certs, appData
var __homedir = home;
var rimraf = require('rimraf');

console.log('dev path is ', devPath);

console.log('homedir is ', __homedir);

var dataServices = new (require('../../src/services/DataServices'))();
rimraf('./temp', function(err) {
    if (err) { throw err; }
    // done
    console.log('done');
});

// dataServices.renameFile('./', 'b', 'a',function(error){
//     if(!error){
//         process.exit(0);
//     }
//     else{
//         process.exit(1);
//     }
// });