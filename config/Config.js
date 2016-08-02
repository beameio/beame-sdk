'use strict';
var path = require('path');
var os   = require('os');
var home = os.homedir();

/** @const {String} **/
var rootDir = process.env.BEAME_DIR || path.join(home, '.beame');

/** @const {String} **/
var localCertsDir = path.join(rootDir, 'v1', 'local');

/** @const {String} **/
var remoteCertsDir = path.join(rootDir, 'v1', 'remote');

/** @const {String} **/
var loadBalancerURL = process.env.BEAME_LB || "http://lb-dev.beameio.net/";

/** @const {String} **/
var metadataFileName = "metadata.json";

/**
 * Certificate file names
 *  @enum {string}
 */
var CertFileNames = {
	"PRIVATE_KEY":      "private_key.pem",
	"TEMP_PRIVATE_KEY": "temp_private_key.pem",
	"X509":             "x509.pem",
	"CA":               "ca.pem",
	"PKCS7":            "pkcs7.pem",
	"P7B":              "p7b.cer",
	"PKCS12":           "cert.pfx",
	"PWD":              "pwd.txt",
	"RECOVERY":         "recovery"
};

/**
 * Certificate response fields
 *  @enum {string}
 */
var CertResponseFields = {
	"x509":  "x509",
	"pkcs7": "pkcs7",
	"ca":    "ca"
};


/**
 * System Modules
 *  @enum {string}
 */
var AppModules = {
	"Developer":    "Developer",
	"Atom":         "Atom",
	"EdgeClient":   "EdgeClient",
	"ProvisionApi": "ProvisionApi",
	"DataServices": "DataServices",
	"UnitTest":     "UnitTest"
};

/**
 * Message Codes
 *  @enum {string}
 */
var MessageCodes = {
	"DebugInfo":           "DebugInfo",
	"EdgeLbError":         "EdgeLbError",
	"OpenSSLError":        "OpenSSLError",
	"ApiRestError":        "ApiRestError",
	"HostnameRequired":    "HostnameRequired",
	"MetadataEmpty":       "MetadataEmpty",
	"NodeFolderNotExists": "NodeFolderNotExists",
	"NodeFilesMissing":    "NodeFilesMissing",
	"CSRCreationFailed":   "CSRCreationFailed",
	"InvalidPayload":      "InvalidPayload"
};


var ResponseKeys = {
	"NodeFiles":                   [metadataFileName, CertFileNames.PRIVATE_KEY, CertFileNames.X509, CertFileNames.CA, CertFileNames.PKCS7, CertFileNames.P7B, CertFileNames.PKCS12, CertFileNames.PWD],
	"DeveloperCreateResponseKeys": ["hostname", "uid", "name", "email"],
	"AtomCreateResponseKeys":      ["hostname", "uid", "name", "parent_fqdn"],
	"EdgeClientResponseKeys":      ["uid", "hostname", "edgeHostname", "parent_fqdn"],
	"LocalClientResponseKeys":     ["uid", "hostname", "edgeHostname", "parent_fqdn", "edge_client_fqdn"],
	"CertificateResponseKeys":     ["x509", "pkcs7", "ca"],
	"RevokeDevCertResponseKeys":   ["recovery_code"]
};

/**
 * Time units
 *  @enum {string}
 */
var TimeUnits = {
	"Second": "s",
	"Minute": "m",
	"Hour":   "h",
	"Day":    "d"
};

module.exports = {
	rootDir,
	localCertsDir,
	remoteCertsDir,
	loadBalancerURL,
	metadataFileName,
	CertFileNames,
	CertResponseFields,
	AppModules,
	MessageCodes,
	ResponseKeys,
	TimeUnits
};
