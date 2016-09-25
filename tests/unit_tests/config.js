/**
 * Created by zenit1 on 25/09/2016.
 */
process.env.BEAME_LOG_LEVEL = "DEBUG";

var chai   = require('chai');
var assert = chai.assert;

var options = {
	"run_update":      process.env.run_upd || "false",
	"run_cert":        process.env.run_cert_serv || "false",
	"run_stats":       process.env.run_stats || "false",
	"run_delete":      process.env.run_delete || "false",
	"developer_atoms": parseInt(process.env.atoms || 1),
	"atom_edges":      parseInt(process.env.edges || 1)
};

exports.options    = options;
exports.chai       = chai;
exports.assert     = assert;
exports.beameUtils = require('../../src/utils/BeameUtils');
exports.beameStore = new (require("../../src/services/BeameStoreV2"))();
exports.Credential = require('../../src/services/Credential');
exports.Logger     = require('../../src/utils/Logger');
exports.BeameConfig = require('../../config/Config');