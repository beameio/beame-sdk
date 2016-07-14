/**
 * Created by zenit1 on 04/07/2016.
 */

var edgeClientServices = new(require('../../src/core/EdgeClientServices'))();
var appHostName = 'meviv8tls5wtw23b.sco0aua73sfynn28.v1.beameio.net';
// var fs = require('fs');
// var path = require('path');
//
// var devPath = global.devPath;
//
// var walk = function(dir, folderToFind,done,finalCallback) {
//     var results = [];
//     fs.readdir(dir, function(err, list) {
//         if (err) return done(err);
//         var pending = list.length;
//         if (!pending) return done(null, results);
//         list.forEach(function(file) {
//             file = path.resolve(dir, file);
//             fs.stat(file, function(err, stat) {
//                 if (stat && stat.isDirectory()) {
//
//                     var name = file.match(/([^\/]*)\/*$/)[1];
//                     //console.log(name);
//                     if(name == folderToFind) {
//                      console.log('---------------- FOUND ---------------',file);
//                         finalCallback(null, file);
//                         return;
//                     }
//
//                     walk(file,folderToFind, function(err, res) {
//                         results = results.concat(res);
//                         if (!--pending) {
//                            done && done(null, results);
//                         }
//                     },finalCallback);
//                 }
//                 else {
//                     results.push(file);
//                     if (!--pending) {
//                        done && done(null, results);
//                     }
//                 }
//             });
//         });
//     });
//
//    // finalCallback('not found',null);
// };
// var find = function(dir, folderName ,done) {
//     var results = [];
//     fs.readdir(dir, function(err, list) {
//         if (err) return done(err);
//         var pending = list.length;
//         if (!pending) return done(null, results);
//         list.forEach(function(file) {
//             file = path.resolve(dir, file);
//             fs.stat(file, function(err, stat) {
//                 if (stat && stat.isDirectory()) {
//                    var name = file.match(/([^\/]*)\/*$/)[1];
//                     console.log(name);
//                    if(name == folderName) {
//                        done(null, file);
//                    }
//                     else{
//                        walk(file, function(err, res) {
//                            results = results.concat(res);
//                            if (!--pending) done("Not found",null);
//                        });
//                    }
//                 }
//             });
//         });
//     });
//
//     done("Not found",null);
// };
//
// function getDirectories(srcpath) {
//     return fs.readdirSync(srcpath).filter(function(file) {
//         return fs.statSync(path.join(srcpath, file)).isDirectory();
//     });
// }
//
//
// var async = require('async');
//
// var scan = function(dir, folderToFind, callback,finalCallback) {
//     fs.readdir(dir, function(err, files) {
//         var returnFiles = [];
//         async.each(files, function(file, next) {
//             var filePath = dir + '/' + file;
//             fs.stat(filePath, function(err, stat) {
//                 if (err) {
//                     return next(err);
//                 }
//                 if (stat.isDirectory()) {
//                     var name = file.match(/([^\/]*)\/*$/)[1];
//                     //console.log(name);
//                     if(name == folderToFind) {
//                         console.log('---------------- FOUND ---------------',file);
//                         finalCallback(null, filePath);
//                         return;
//                     }
//                     scan(filePath, folderToFind, function(err, results) {
//                         if (err) {
//                             return next(err);
//                         }
//                         //returnFiles = returnFiles.concat(results);
//                         next();
//                     },finalCallback)
//                 }
//                 else if (stat.isFile()) {
//                     next();
//                 }
//             });
//         }, function(err) {
//            callback && callback(err, null);
//         });
//     });
// };
//


// scan(devPath,appHostName, null,function(err, files) {
//     // Do something with files that ends in '.ext'.
//    if(files){
//        console.log(files);
//    }
//     else{
//         console.error("Path not found");
//    }
//
// });

// var execFile = require('child_process').execFile;
// execFile('find', [ devPath ], function(err, stdout, stderr) {
//     var file_list = stdout.split('\n');
//     /* now you've got a list with full path file names */
// });

// walk(devPath,appHostName,null,function(error,data){
//     if(data){
//         console.log(data);
//     }
//     else{
//         console.error(error);
//     }
//
// });
//
// var glob = require( 'glob' );
//
// glob( global.devPath + '/**/' + appHostName + '/**/', function( err, files ) {
//     console.log( 'file',files );
// });

// var dirServices = require('../../src/services/BeameDirServices');
//
//
// dirServices.findHostPathAndParent(global.devPath,appHostName,function(error,path){
//     console.log('result',error,path);
// });


edgeClientServices.deleteEdgeClient('pzi0qlisimrdawrn.v1.r.d.edge.eu-central-1a-1.v1.beameio.net',function(error,payload){
    if(!error){
        console.log(payload);
        process.exit(0);
    }
    else{
        console.error(error);
        process.exit(1);
    }
});

// edgeClientServices.revokeCert('p0mksbche7x91hk7.v1.r.d.edge.eu-central-1a-1.v1.beameio.net',function(error,payload){
//     if(!error){
//         console.log(payload);
//         process.exit(0);
//     }
//     else{
//         console.error(error);
//         process.exit(1);
//     }
// });
//
// edgeClientServices.renewCert('pzi0qlisimrdawrn.v1.r.d.edge.eu-central-1a-1.v1.beameio.net',function(error,payload){
//     if(!error){
//         console.log(payload);
//         process.exit(0);
//     }
//     else{
//         console.error(error);
//         process.exit(1);
//     }
// });

// edgeClientServices.createEdgeClient('pdxz2ngkxzojgnx2.lh5ftk76qu9f801w.v1.beameio.net',function(error,payload){
//     if(!error){
//         console.log(payload);
//         process.exit(0);
//     }
//     else{
//         console.error(error);
//         process.exit(1);
//     }
// });