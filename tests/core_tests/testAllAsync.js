/**
 * Created by zenit1 on 06/07/2016.
 */

/**
 * Created by zenit1 on 06/07/2016.
 */
var async = require("async");
var _ = require('underscore');

var developerServices = new (require('../../src/core/DeveloperServices'))();
var atomServices = new (require('../../src/core/AtomServices'))();
var edgeClientServices = new (require('../../src/core/EdgeClientServices'))();

var createEdgeClient = function (devHostname, appHostName, callback) {
    edgeClientServices.createEdgeClient(devHostname, appHostName, function (error, payload) {
        if (!error) {
            //  console.log('/**********Create Edge Client Response***********/');
            //  console.log(payload);
            callback && callback(null, payload);
        }
        else {
            console.error(error);
            callback && callback(error, null);
        }
    });
};

var createAtom = function (appName, devHostname, edges, finalCallback) {
    atomServices.createAtom(devHostname, appName, function (error, payload) {
        if (!error) {
            // console.log('/**********Create Atom Response***********/');
            //  console.log(payload);
            var appHostname = payload.hostname;


            var asyncTasks = [];


            for (var i = 0; i < edges; i++) {
                asyncTasks.push(
                    function (callback) {

                        createEdgeClient(devHostname, appHostname, function (error, data) {
                            if (error) {
                                callback('edge creation failed for ' + appHostname, null);
                            }
                            else {
                                console.log('Edge client created for ' + appHostname, data);
                                callback(null, data);
                            }
                        });
                    });
            }


            async.parallel(asyncTasks, function (error, data) {
                // All tasks are done now
                finalCallback(error, data);
            });


        }
        else {
            console.error(error);
        }
    });
};

var createDeveloper = function (name, email, atoms, edges, finalCallback) {
    developerServices.createDeveloper(name, email, function (error, payload) {
        if (!error) {
            //   console.log('/**********Create Developer Response***********/');
            //   console.log(payload);
            var developerHostname = payload.hostname;


            var asyncTasks = [];

            var __f = function(ind){
                asyncTasks.push(
                    function (callback) {

                        createAtom(name + '-app-' + ind, developerHostname, edges, function (error, data) {
                            if (error) {
                                callback('atom creation failed for ' + developerHostname, null);
                            }
                            else {
                                console.log('atom client created for ' + developerHostname, data);
                                callback(null, data);
                            }
                        });


                    });
            };

            for (var i = 0; i < atoms; i++) {
                __f(i);
            }


            async.parallel(asyncTasks, function (error, data) {
                // All tasks are done now
                finalCallback(error, data);
            });


        }
        else {
            console.error(error);
        }
    });
};


var start = function () {

    var developers = process.argv[2] || 2;
    var atoms = process.argv[3] || 1;
    var edges = process.argv[4] || 1;

    // Array to hold async tasks
    var asyncTasks = [];

    var __f = function(ind){
        asyncTasks.push(
            function ( callback) {

                createDeveloper('dev-' + ind, 'dev-' + ind + '@beame.io', atoms, edges, callback);

            })
    };

    for (var i = 0; i < developers; i++) {
        __f(i);
    }


// Now we have an array of functions, each containing an async task
// Execute all async tasks in the asyncTasks array
    async.parallel(asyncTasks, function () {
        // All tasks are done now
        console.log('done');
    });
};


start();