/**
 * Created by zenit1 on 03/07/2016.
 */
'use strict';
require('../utils/Globals');
var path = require('path');
var debug = require("debug")("./src/services/DataServices.js");
var fs = require('fs');
var exec = require('child_process').exec;
var async = require('async');

/**------------------------ private methods ---------------------**/
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

/**------------------- create csr -----------------------**/
DataServices.prototype.createCSR = function (dirPath, hostname) {
    var self = this;
    var errMsg;

    return new Promise(function (resolve, reject) {

        /* --------- generate RSA key: ------------------------------------------------*/
        var cmd = "openssl genrsa 2048";

        debug(global.formatDebugMessage(global.AppModules.DataServices, global.MessageCodes.DebugInfo, "generating private key with", {"cmd": cmd}));

        exec(cmd, function (error, stdout, stderr) {
            var devPK = stdout;

            if (error !== null) {
                /* -------  put error handler to deal with possible openssl failure -----------*/
                errMsg = global.formatDebugMessage(global.AppModules.DataServices, global.MessageCodes.OpenSSLError, "Failed to generate Private Key", {
                    "error": error,
                    "stderr": stderr
                });

                reject(errMsg);
                return;
            }

            var pkFile = path.join(dirPath,global.CertFileNames.PRIVATE_KEY);

            self.saveFile(dirPath,global.CertFileNames.PRIVATE_KEY, devPK, function (error) {
                if (!error) {
                    cmd = "openssl req -key " + pkFile + " -new -subj \"/" + (global.csrSubj + hostname) + "\"";
                    debug(global.formatDebugMessage(global.AppModules.DataServices, global.MessageCodes.DebugInfo, "generating CSR with", {"cmd": cmd}));

                    try {
                        exec(cmd,
                            /**
                             *
                             * @param error
                             * @param stdout => return CSR
                             * @param stderr
                             */
                            function (error, stdout, stderr) {
                                if (error !== null) {
                                    errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Failed to generate CSR", {
                                        "error": error,
                                        "stderr": stderr
                                    });
                                    console.error(errMsg);
                                    reject(errMsg);
                                }
                                else {
                                    resolve(stdout);
                                }

                            });
                    }
                    catch (error) {
                        errMsg = global.formatDebugMessage(global.AppModules.ProvisionApi, global.MessageCodes.OpenSSLError, "Create Developer CSR", {"error": error});
                        console.error(errMsg);
                        reject(errMsg);
                    }
                }
                else {
                    errMsg = global.formatDebugMessage(global.AppModules.DataServices, global.MessageCodes.OpenSSLError, "Failed to save Private Key", {
                        "error": error,
                        "stderr": stderr
                    });
                    console.error(errMsg);
                    reject(errMsg);
                }
            });

        });

    });
};

/**------------------- save payload methods -----------------------**/

/**
 * save provision payload to file
 * @param {String} dirPath
 * @param {Object} payload
 * @param {Array} keys
 * @param {String} level => Developer | Atom | EdgeClient
 * @param {Function} callback
 */
DataServices.prototype.savePayload = function (dirPath, payload, keys, level, callback) {
    var self = this;
    var data = {
        "level": level.toLowerCase()
    };

    for (var i = 0; i < keys.length; i++) {
        if (payload[keys[i]]) {
            data[keys[i]] = payload[keys[i]];
        }
        else {
            var errMsg = global.formatDebugMessage(level, global.MessageCodes.InvalidPayload, "payload key missing", {
                "payload": payload,
                "key": keys[i]
            });
            console.error(errMsg);
            callback(errMsg, null);
            return;
        }
    }

    self.saveFile(dirPath, global.metadataFileName, JSON.stringify(data, null, 2), callback);
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
        self.saveFileAsync(path.join(dirPath,targetName), payload[responseField], function (error) {
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
                    function (callback) {
                        exec('openssl pkcs7 -print_certs -in ' + dirPath + global.CertFileNames.PKCS7, function (error, stdout) {
                            if (error) {
                                callback(error, null);
                                return;
                            }
                            self.saveFileAsync(path.join(dirPath,global.CertFileNames.P7B), stdout, function (error) {
                                error ? callback(error, null) : callback(null, true);
                            });
                        });
                    },
                    function (callback) {
                        var pwd = randomPassword();

                        var cmd = "openssl pkcs12 -export -in " + path.join(dirPath,global.CertFileNames.X509) + " -certfile " + path.join(dirPath,global.CertFileNames.CA) + " -inkey " + path.join(dirPath,global.CertFileNames.PRIVATE_KEY) + " -password pass:'" + pwd + "' -out " + path.join(dirPath + global.CertFileNames.PKCS12);

                        try {
                            exec(cmd, function (error) {
                                if (error) {
                                    callback(error, null);
                                    return;
                                }
                                self.saveFileAsync(path.join(dirPath,global.CertFileNames.PWD), pwd, function (error) {
                                    error ? callback(error, null) : callback(null, true);
                                });
                            });

                        }
                        catch (e) {
                            callback(e, null);
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

/**------------------- folder/files methods -----------------------**/

/**
 * check if directory or file exists
 * @param {String} dir
 * @returns {boolean}
 */
DataServices.prototype.isPathExists = function (dir) {
    try {
        fs.accessSync(dir, fs.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 *
 * @param {String} dirPath
 * @param {Array} nodeFiles
 * @param {String} module
 * @returns {boolean}
 */
DataServices.prototype.isNodeFilesExists = function (dirPath, nodeFiles, module) {
    var self = this;
    for (var i = 0; i < nodeFiles.length; i++) {
        if (!self.isPathExists(path.join(dirPath, nodeFiles[i]))) {
            console.error(global.formatDebugMessage(module, global.MessageCodes.NodeFilesMissing, "cert missing", {
                "path": dirPath,
                "file": nodeFiles[i]
            }));
            return false;
        }
    }

    return true;
};

/**
 * create directory for supplied path
 * @param {String} dirPath
 */
DataServices.prototype.createDir = function (dirPath) {
    try {
        fs.accessSync(dirPath, fs.F_OK);
    }
    catch (e) {
        fs.mkdirSync(dirPath);
    }
};

/**
 *
 * @param {String} dirPath
 * @param fileName
 * @param {Object} data
 * @param {Function|null} [cb]
 */
DataServices.prototype.saveFile = function (dirPath, fileName,data, cb) {
    try {
        fs.writeFileSync(path.join(dirPath,fileName), data);
        cb && cb(null, true);
    }
    catch (error) {
        cb && cb(error, null);
    }

};

/**
 *
 * @param {String} dirPath
 * @param {Object} data
 * @param {Function|null} [cb]
 */
DataServices.prototype.saveFileAsync = function (dirPath, data, cb) {
    fs.writeFile(dirPath, data, function (error) {
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
 * @param {String} dirPath
 */
DataServices.prototype.readJSON = function (dirPath) {
    if (this.isPathExists(dirPath)) {
        try {
            var file = fs.readFileSync(dirPath);
            return JSON.parse(file);
        }
        catch (error) {
            return {};
        }
    }

    return {};
};

module.exports = DataServices;