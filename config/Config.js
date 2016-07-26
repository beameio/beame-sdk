'use strict';
var path          = require('path');
var os            = require('os');
var home          = os.homedir();

/** @const {String} **/
var rootDir = process.env.BEAME_DIR || path.join(home, '.beame');

/** @const {String} **/
var localCertsDir = path.join(rootDir, 'v1', 'local');

/** @const {String} **/
var remoteCertsDir = path.join(rootDir, 'v1', 'remote');

/** @const {String} **/
var loadBalancerURL = process.env.BEAME_LB || "http://lb-dev.beameio.net/";

module.exports = {
	rootDir,
	localCertsDir,
	remoteCertsDir,
	loadBalancerURL
};
