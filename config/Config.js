'use strict';
/**
 * @typedef {Object} RegistrationPayload
 * @property {String} fqdn
 * @property {String} parent_fqdn
 * @property {Number} level
 */
const path       = require('path');
const os         = require('os');
const home       = os.homedir();
const npmPrefix  = require('npm-prefix');
const npmRootDir = npmPrefix();


const CertEndpoint = "https://beameio-net-certs-dev.s3.amazonaws.com";

const InitFirstRemoteEdgeClient = true;
const PinAtomPKbyDefault        = false;

const EnvProfile = {
	Name : 'Dev',
	FqdnPattern: '.p.'
};

/** @const {String} **/
const rootDir                   = process.env.BEAME_DIR || path.join(home, '.beame');


/** @const {String} **/
const remotePKsDirV1 = path.join(rootDir, 'pki');

const localCertsDirV2 = path.join(rootDir, 'v2');

const issuerCertsPath = path.join(rootDir,'ocsp-cache');

/** @const {String} **/
const authServerURL = process.env.BEAME_AUTH_SRVR_URL || "https://p2payp4q8f5ruo22.q6ujqecc83gg6fod.v1.d.beameio.net";

/** @const {String} **/
const loadBalancerURL = process.env.BEAME_LOAD_BALANCER_URL || "https://may129m153e6emrn.bqnp2d2beqol13qn.v1.d.beameio.net";

const beameDevCredsFqdn = process.env.BEAME_DEV_CREDS_FQDN || "n6ge8i9q4b4b5vb6.h40d7vrwir2oxlnn.v1.d.beameio.net";

const beameForceEdgeFqdn = process.env.BEAME_FORCE_EDGE_FQDN || "";

const beameForceEdgeIP   = process.env.BEAME_FORCE_EDGE_IP || 0;

const defaultValidityPeriod = process.env.BEAME_CERT_VALIDITY_PERIOD || 60 * 60 * 24 * 365;

const defaultAllowedClockDiff = 100; //in seconds

const defaultAuthTokenTtl = defaultAllowedClockDiff;

const defaultTimeFuzz = 10;

/** @const {String} **/
const metadataFileName = "metadata.json";

/** @const {String} **/
const s3MetadataFileName = "metadata.json";

const ApprovedZones = ['beameio.net','beame.io'];

/**
 * Registration sources
 * DON'T TOUCH, should by synchronized with backend services
 * @readonly
 * @enum {Number}
 */
const RegistrationSource = {
	"Unknown":        0,
	"NodeJSSDK":      1,
	"InstaSSL":       2,
	"InstaServerSDK": 3,
	"IOSSDK":         4
};

const RequestType = {
	"RequestWithFqdn" : "RequestWithFqdn",
	"RequestWithParentFqdn" : "RequestWithParentFqdn",
	"RequestWithAuthServer" : "RequestWithAuthServer",
};

/**
 * Certificate file names
 *  @enum {string}
 */
const CertFileNames = {
	"PRIVATE_KEY":        "private_key.pem",
	"PUBLIC_KEY":         "public_key.pem",
	"BACKUP_PRIVATE_KEY": "private_key_bk.pem",
	"BACKUP_PUBLIC_KEY":  "public_key_bk.pem",
	"X509":               "x509.pem",
	"P7B":                "p7b.cer",
	"PKCS12":             "cert.pfx",
	"PWD":                "pwd.txt"
	// "BEAME_CA":           "beame_ca.pem",
	// "CA":                 "ca.pem",
	// "CA_G2":              "ca_g2.pem",
	//"PKCS7":              "pkcs7.pem",

};


const MetadataProperties = {
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
const CertResponseFields = {
	"x509":  "x509",
	"p7b": "p7b",
	"ca":    "ca"
	//"pkcs7": "pkcs7",
	// ,"beame_ca": "beame_ca"
	// ,"ca_g2": "ca_g2"
};


/**
 * System Modules
 *  @enum {string}
 */
const AppModules = {
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
const MessageCodes = {
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


const ResponseKeys = {
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
const TimeUnits = {
	"Second": "s",
	"Minute": "m",
	"Hour":   "h",
	"Day":    "d"
};

const CertValidationError = {
	"InFuture": "InFuture",
	"Expired":  "Expired"
};

const SNIServerPort = (process.env.SNI_SERVER_PORT > 0 && process.env.SNI_SERVER_PORT < 65536) ? process.env.SNI_SERVER_PORT : 0;

module.exports = {
	rootDir,
	npmRootDir,
	EnvProfile,
	localCertsDirV2,
	remotePKsDirV1,
	issuerCertsPath,
	loadBalancerURL,
	beameDevCredsFqdn,
	metadataFileName,
	s3MetadataFileName,
	CertFileNames,
	CertResponseFields,
	AppModules,
	MessageCodes,
	ResponseKeys,
	TimeUnits,
	SNIServerPort,
	CertEndpoint,
	InitFirstRemoteEdgeClient,
	PinAtomPKbyDefault,
	MetadataProperties,
	authServerURL,
	beameForceEdgeFqdn,
	beameForceEdgeIP,
	RegistrationSource,
	RequestType,
	ApprovedZones,
	defaultValidityPeriod,
	CertValidationError,
	defaultAllowedClockDiff,
	defaultAuthTokenTtl,
	defaultTimeFuzz
};
