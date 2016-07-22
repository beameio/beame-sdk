/**
 * Created by zenit1 on 19/07/2016.
 */
var chai = require('chai');
var assert = chai.assert;

var options = {
	"run_update": process.env.run_upd || "false",
	"run_cert": process.env.run_cert_serv || "false",
	"run_stats": process.env.run_stats || "false",
	"run_delete": process.env.run_delete || "false",
	"developer_atoms" : parseInt(process.env.atoms || 8),
	"atom_edges" : parseInt(process.env.edges || 16)
};

exports.options = options;
exports.chai = chai;
exports.assert = assert;
exports.beameUtils = require('../../src/utils/BeameUtils');
exports.dataServices = new (require('../../src/services/DataServices'))();
exports.developerServices = new (require('../../src/core/DeveloperServices'))();
exports.atomServices = new (require('../../src/core/AtomServices'))();
exports.edgeServices = new (require('../../src/core/EdgeClientServices'))();