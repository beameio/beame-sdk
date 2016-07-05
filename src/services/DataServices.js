/**
 * Created by zenit1 on 03/07/2016.
 */
var debug = require("debug")("./src/services/DataServices.js");
var fs = require('fs');
var exec = require('child_process').exec;
var async = require('async');

//private methods
function randomPassword(length) {
    var len = length || 16;
    var chars = "abcdefghijklmnopqrstuvwxyz!@#$%^&*()-+<>ABCDEFGHIJKLMNOP1234567890";
    var pass = "";
    for (var x = 0; x < len; x++) {
        var i = Math.floor(Math.random() * chars.length);
        pass += chars.charAt(i);
    }

    return pass;
}
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
 * @param finalCallback
 */
DataServices.prototype.saveCerts = function (dirPath, payload, finalCallback) {
    var self = this;
    var errMsg;

    var saveCert = function (responseField, targetName, callback) {
        if (!payload[responseField]) {
            errMsg = global.formatDebugMessage(global.AppModules.DataServices, global.MessageCodes.ApiRestError, responseField + " missing in API response", {"path": dirPath});
            return;
        }

        //save cert
        self.saveFileAsync(dirPath + targetName, payload[responseField], function (error) {
            if (error) {
                errMsg = global.formatDebugMessage(global.AppModules.DataServices, global.MessageCodes.ApiRestError, "Saving " + responseField + " failed", {"path": dirPath});
                console.error(errMsg);
                callback(errMsg, null);
                return;
            }

            callback(null, true);
        });
    };

    async.parallel(
        [
            function (callback) {
                saveCert(global.CertRespponseFields.x509, global.CertFileNames.X509, callback);
            },
            function (callback) {
                saveCert(global.CertRespponseFields.ca, global.CertFileNames.CA, callback);
            },
            function (callback) {
                saveCert(global.CertRespponseFields.pkcs7, global.CertFileNames.PKCS7, callback);
            }

        ],
        function (error) {
            if (error) {
                finalCallback(error, null);
                return;
            }


            async.parallel(
                [
                    function(callback){
                        exec('openssl pkcs7 -print_certs -in ' + dirPath + global.CertFileNames.PKCS7, function (error, stdout) {
                            if (error) {
                                callback(error, null);
                                return;
                            }
                            self.saveFileAsync(dirPath + global.CertFileNames.P7B, stdout, function(error){
                                if(error){
                                    callback(error,null);
                                }
                            });
                        });
                    },
                    function(callback){
                        var pwd = randomPassword();

                        var cmd = "openssl pkcs12 -export -in " + dirPath + global.CertFileNames.X509 + " -certfile " + dirPath + global.CertFileNames.CA + " -inkey " + dirPath + global.CertFileNames.PRIVATE_KEY + " -password pass:'" + pwd + "' -out " + dirPath + global.CertFileNames.PKCS12;

                        try{
                            exec(cmd, function (error) {
                                if (error) {
                                    callback(error, null);
                                    return;
                                }
                                self.saveFileAsync(dirPath + global.CertFileNames.PWD, pwd, function(error){
                                    if(error){
                                        callback(error,null);
                                    }
                                });
                            });

                        }
                        catch(e){
                            callback(e,null);
                        }

                    }
                ],
                function (error) {
                    if (error) {
                        finalCallback(error, null);
                        return;
                    }

                    finalCallback && finalCallback(null, true);
                }
            );
        }
    );

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
 *
 * @param {String} path
 * @param {Object} data
 * @param {Function|null} [cb]
 */
DataServices.prototype.saveFileAsync = function (path, data, cb) {
    fs.writeFile(path, data, function (error) {
        if (!cb) return;
        if (error) {
            cb(error, null);
            return;
        }
        cb(null, true);
    });
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