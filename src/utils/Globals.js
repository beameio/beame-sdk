/**
 * Created by zenit1 on 04/07/2016.
 */
'use strict';
var path          = require('path');
var os            = require('os');
var home          = os.homedir();
global.__homedir  = home;

/**
 * @typedef {Object} DebugMessage
 * @param {String} module
 * @param {String} code
 * @param {String} message
 * @param {Object} data
 */

/**
 *
 * @param {String} module
 * @param {String} code
 * @param {String} message
 * @param {Object} data
 * @returns {typeof DebugMessage}
 */
global.formatDebugMessage = function (module, code, message, data) {
	return {
		module,
		code,
		message,
		data
	};
};

/** @const {String} */
global.csrSubj = "C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=";

/** @const {String} **/
global.metadataFileName = "metadata.json";


/** @const {String} **/
global.apiUIDTemplatePattern = "{{UID}}";

/** @const {String} **/
global.loadBalancerEdnpoint = "http://lb-dev.beameio.net/";

/**
 * Certificate file names
 *  @enum {string}
 */
global.CertFileNames = {
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
global.CertRespponseFields = {
	"x509":  "x509",
	"pkcs7": "pkcs7",
	"ca":    "ca"
};

global.authData = {
	"PK_PATH":   "/authData/pk.pem",
	"CERT_PATH": "/authData/x509.pem"
};

/**
 * System Modules
 *  @enum {string}
 */
global.AppModules = {
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
global.MessageCodes = {
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

/**
 * @typedef {Object} AwsRegion
 * @property {String} Name
 * @property {String} Code
 */

/**
 * @type {AwsRegion[]}
 */
global.AwsRegions = [
	{
		"Name": "EU (Ireland)",
		"Code": "eu-west-1"
	},
	{
		"Name": "Asia Pacific (Singapore)",
		"Code": "ap-southeast-1"
	},
	{
		"Name": "Asia Pacific (Sydney)",
		"Code": "ap-southeast-2"
	},
	{
		"Name": "EU (Frankfurt)",
		"Code": "eu-central-1"
	},
	{
		"Name": "Asia Pacific (Seoul)",
		"Code": "ap-northeast-2"
	},
	{
		"Name": "Asia Pacific (Tokyo)",
		"Code": "ap-northeast-1"
	},
	{
		"Name": "US East (N. Virginia)",
		"Code": "us-east-1"
	},
	{
		"Name": "South America (S?o Paulo)",
		"Code": "sa-east-1"
	},
	{
		"Name": "US West (N. California)",
		"Code": "us-west-1"
	},
	{
		"Name": "US West (Oregon)",
		"Code": "us-west-2"
	}
];


global.ResponseKeys = {
	"NodeFiles":                   [global.metadataFileName, global.CertFileNames.PRIVATE_KEY, global.CertFileNames.X509, global.CertFileNames.CA, global.CertFileNames.PKCS7, global.CertFileNames.P7B, global.CertFileNames.PKCS12, global.CertFileNames.PWD],
	"DeveloperCreateResponseKeys": ["hostname", "uid", "name", "email"],
	"AtomCreateResponseKeys":      ["hostname", "uid", "name", "parent_fqdn"],
	"EdgeClientResponseKeys":      ["uid", "hostname", "edgeHostname", "parent_fqdn"],
	"CertificateResponseKeys":     ["x509", "pkcs7", "ca"],
	"RevokeDevCertResponseKeys":   ["recovery_code"]
};
