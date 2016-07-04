/**
 * Created by zenit1 on 03/07/2016.
 */
var debug = require("debug")("./src/services/DataServices.js");
var fs = require('fs');
// var async = require('async');
// var exec = require('child_process').exec;

//private methods

/**
 *
 * @constructor
 */
var DataServices = function () {

};

/**
 * check if directory or file exists
 * @param {String} path
 * @returns {boolean}
 */
DataServices.prototype.isPathExists = function (path) {
    try {
        fs.accessSync(path, fs.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 *
 * @param {String} path
 * @param {Array} nodeFiles
 * @returns {boolean}
 */
DataServices.prototype.isNodeFilesExists = function (path, nodeFiles) {
    for (var i = 0; i < nodeFiles.length; i++) {
        if (!fs.existsSync(path + nodeFiles[i])) {
            console.error({"message": "Error! missing: " + path + nodeFiles[i]});
            //       process.exit(-1);
            return false;
        }
    }

    return true;
};

/**
 * create directory for supplied path
 * @param {String} path
 */
DataServices.prototype.createDir = function (path) {
    try {
        if (fs.lstatSync(path)) {
            debug("Directory for developer already exists");
        }
    }
    catch (e) {
        debug("Dev path ", path);
        fs.mkdirSync(path);
    }
};

/**
 * save provision payload to file
 * @param {String} path
 * @param {Object} payload
 * @param {Array} keys
 * @param {Function} callback
 */
DataServices.prototype.savePayload = function (path, payload, keys, callback) {
    var self = this;
    var data = {};

    for (var i = 0; i < keys.length; i++) {
        if (payload[keys[i]]) {
            data[keys[i]] = payload[keys[i]];
        }
        else {
            debug('Error, missing <' + keys[i] + '> element in provisioning answer');
            callback(null);
            return;
        }
    }

    self.saveFile(path, JSON.stringify(data, null, 2), callback);
};

/**
 *
 * @param {String} dirPath
 * @param {OrderPemResponse} payload
 * @param {Array} keys
 * @param callback
 */
DataServices.prototype.saveCerts = function (dirPath, payload, keys, callback) {
    for (var i = 0; i < keys.length; i++) {
        if (payload[keys[i]]) {

            fs.writeFileSync(dirPath + keys[i] + '.pem', payload[keys[i]]);
        }
        else {

            callback({"message": "Error, missing <" + keys[i] + "> element in provisioning answer"}, null);
            return;
        }
    }

    callback && callback(null, payload);
};

/**
 *
 * @param {String} path
 * @param {Object} data
 * @param {Function|null} [cb]
 */
DataServices.prototype.saveFile = function (path, data, cb) {
    try {
        fs.writeFileSync(path, data);
        cb && cb(null, true);
    }
    catch (error) {
        cb && cb(error, null);
    }

};

/**
 * read JSON file
 * @param {String} path
 */
DataServices.prototype.readJSON = function (path) {
    if (this.isPathExists(path)) {
        try {
            var file = fs.readFileSync(path);
            return JSON.parse(file);
        }
        catch (error) {
            return {};
        }
    }

    return {};
};

module.exports = DataServices;