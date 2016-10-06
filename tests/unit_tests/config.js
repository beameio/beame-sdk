/**
 * Created by zenit1 on 25/09/2016.
 */
process.env.BEAME_LOG_LEVEL = "DEBUG";

var chai   = require('chai');
var assert = chai.assert;

var options = {};

exports.options      = options;
exports.chai         = chai;
exports.assert       = assert;
exports.beameUtils   = require('../../src/utils/BeameUtils');
exports.CommonUtils   = require('../../src/utils/CommonUtils');
exports.beameStore   = new (require("../../src/services/BeameStoreV2"))();
exports.ProvisionApi = new (require('../../src/services/ProvisionApi'))();
exports.Credential   = require('../../src/services/Credential');
exports.Logger       = require('../../src/utils/Logger');
exports.BeameConfig  = require('../../config/Config');