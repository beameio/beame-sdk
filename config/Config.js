'use strict';
/**
 * @typedef {Object} RegistrationPayload
 * @property {String} fqdn
 * @property {String} parent_fqdn
 * @property {Number} level
 */


var path         = require('path');
var os           = require('os');
var home         = os.homedir();
var npmPrefix    = require('npm-prefix');
const npmRootDir = npmPrefix();


const CertEndpoint = "https://beameio-net-certs.s3.amazonaws.com";

const InitFirstRemoteEdgeClient = true;
const PinAtomPKbyDefault        = false;
/** @const {String} **/
var rootDir                     = process.env.BEAME_DIR || path.join(home, '.beame');


/** @const {String} **/
var remotePKsDirV1 = path.join(rootDir, 'pki');


var localCertsDirV2 = path.join(rootDir, 'v2');


/** @const {String} **/
const authServerURL = process.env.BEAME_AUTH_SRVR_URL || "https://ypxf72akb6onjvrq.ohkv8odznwh5jpwm.v1.p.beameio.net";

/** @const {String} **/
const loadBalancerURL = process.env.BEAME_LOAD_BALANCER_URL || "https://ioigl3wzx6lajrx6.tl5h1ipgobrdqsj6.v1.p.beameio.net";

const beameDevCredsFqdn = process.env.BEAME_DEV_CREDS_FQDN || "am53rz8o6cjsm0xm.gjjpak0yxk8jhlxv.v1.p.beameio.net";

const beameForceEdgeFqdn = process.env.BEAME_FORCE_EDGE_FQDN || "";
const beameForceEdgeIP = process.env.BEAME_FORCE_EDGE_IP || 0;

/** @const {String} **/
var metadataFileName = "metadata.json";

/** @const {String} **/
var s3MetadataFileName = "metadata.json";

/** @const {String} **/
var PKsFileName = "PKs.json";

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
 * Certificate file names
 *  @enum {string}
 */
var CertificateFiles = {
	"PRIVATE_KEY": "private_key.pem",
	"X509":        "x509.pem",
	"CA":          "ca.pem",
	"PKCS7":       "pkcs7.pem",
	"P7B":         "p7b.cer",
	"PKCS12":      "cert.pfx",
	"PWD":         "pwd.txt"
};

var MetadataProperties = {
	LEVEL:       "level",
	FQDN:        "fqdn",
	UID:         "uid",
	NAME:        "name",
	PARENT_FQDN: "parent_fqdn",
	EDGE_FQDN:   "edge_fqdn",
	PATH:        "path"
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
	"BeameEntity":      "BeameEntity",
	"BeameSDKCli":      "BeameSDKCli",
	"BeameCreds":       "BeameCreds",
	"BeameCrypto":      "BeameCrypto",
	"BeameServer":      "BeameServer",
	"BeameUtils":       "BeameUtils",
	"BeameStore":       "BeameStore",
	"BeameSystem":      "BeameSystem",
	"BeameDirServices": "BeameDirServices",
	"ProvisionApi":     "ProvisionApi",
	"DataServices":     "DataServices",
	"UnitTest":         "UnitTest",
	"BaseHttpsServer":  "BaseHttpsServer",
	"SNIServer":        "SNIServer",
	"BeameSDKlauncher": "BeameSDKlauncher",
	"ProxyClient":      "ProxyClient",
	"Tunnel":           "Tunnel",
	"OpenSSL":          "OpenSSL",
	"AuthToken":        "AuthToken"
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
	"NodeFiles":                 [metadataFileName, CertFileNames.PRIVATE_KEY, CertFileNames.X509, CertFileNames.CA, CertFileNames.PKCS7, CertFileNames.P7B, CertFileNames.PKCS12, CertFileNames.PWD],
	"EntityMetadataKeys":        ["fqdn", "parent_fqdn", "name", "email", "level", "local_ip", "edge_fqdn"],
	"EntityCreateResponseKeys":  ["fqdn"],
	"CertificateResponseKeys":   ["x509", "pkcs7", "ca"],
	"RevokeDevCertResponseKeys": ["recovery_code"]
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


var SNIServerPort = (process.env.SNI_SERVER_PORT > 0 && process.env.SNI_SERVER_PORT < 65536) ? process.env.SNI_SERVER_PORT : 0;

module.exports = {
	rootDir,
	npmRootDir,
	localCertsDirV2,
	remotePKsDirV1,
	loadBalancerURL,
	beameDevCredsFqdn,
	metadataFileName,
	s3MetadataFileName,
	CertFileNames,
	CertificateFiles,
	CertResponseFields,
	AppModules,
	MessageCodes,
	ResponseKeys,
	TimeUnits,
	SNIServerPort,
	PKsFileName,
	CertEndpoint,
	InitFirstRemoteEdgeClient,
	PinAtomPKbyDefault,
	MetadataProperties,
	authServerURL,
	beameForceEdgeFqdn,
	beameForceEdgeIP
};
