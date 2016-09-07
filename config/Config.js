'use strict';
var path                 = require('path');
var os                   = require('os');
var home                 = os.homedir();
var npmPrefix            = require('npm-prefix');
const npmRootDir         = npmPrefix();
const AuthServerEndPoint = "https://registration-staging.beameio.net";

const CertEndpoint = "https://beameio-net-certs-staging.s3.amazonaws.com";

const AuthorizationAtomFqdn     = "hbdtatsa1eywxy7m.w3ndpqy0sxf9zpjy.v1.beameio.net";
const AuthenticationAtomFqdn    = "jaclmjhdflzibbm1.w3ndpqy0sxf9zpjy.v1.beameio.net";
const InitFirstRemoteEdgeClient = true;
const PinAtomPKbyDefault        = false;
/** @const {String} **/
var rootDir                     = process.env.BEAME_DIR || path.join(home, '.beame');
var beameMasterCredFqdn 		= process.env.BEAME_MASTER_CREDS || null;
/** @const {String} **/
var localCertsDirV1 = path.join(rootDir, 'v1', 'local');

/** @const {String} **/
var remotePKsDirV1 = path.join(rootDir, 'pki');

/** @const {String} **/
var remoteCertsDirV1 = path.join(rootDir, 'v1', 'remote');

var localCertsDirV2 = path.join(rootDir, 'v2');


/** @const {String} **/
var loadBalancerURL = process.env.BEAME_LB || "http://lb-dev.beameio.net/";

var beameZeroLevelAuthData = {
	"PK_PATH":   "/authData/pk.pem",
	"CERT_PATH": "/authData/x509.pem"
};

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
"PRIVATE_KEY"            : "private_key.pem",
"X509"                   : "x509.pem",
"CA"                     : "ca.pem",
"PKCS7"                  : "pkcs7.pem",
"P7B"                    : "p7b.cer",
"PKCS12"                 : "cert.pfx",
"PWD"                    : "pwd.txt"
};

var MetadataProperties = {
  LEVEL        : "level",
  FQDN		   : "fqdn",
  UID          : "uid",
  NAME         : "name",
  PARENT_FQDN  : "parent_fqdn",
  EDGEHOSTNAME : "edgeHostname",
	PATH		:"path"
};

var CredentialStatus = {
	PRIVATE_KEY:       1 << 1,
	CERT:              1 << 2,
	BEAME_ISSUED_CERT: 1 << 3,
	NON_BEAME_CERT:    1 << 4,
	EMPTY_DIR:         1 << 5,
	DIR_NOTREAD:       1 << 6
};

var SecurityPolicy = {
	Basic:           1 << 0,
	CanHasChildren:  1 << 1,
	CanAuthorize:    1 << 2,
	CanAuthenticate: 1 << 3,
	CanAttachPolicy: 1 << 4
};

/** @enum {String} **/
var IdentityType       = {
	"Developer":  "Developer",
	"Atom":       "Atom",
	"EdgeClient": "EdgeClient"
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
	"BeameEntity":    "BeameEntity",
	"BeameSDKCli":      "BeameSDKCli",
	"BeameCreds":       "BeameCreds",
	"BeameCrypto":      "BeameCrypto",
	"BeameServer":      "BeameServer",
	"BeameUtils":       "BeameUtils",
	"BeameStore":       "BeameStore",
	"BeameSystem":      "BeameSystem",
	"BeameDirServices": "BeameDirServices",
	"Developer":        "Developer",
	"Atom":             "Atom",
	"AtomAgent":        "AtomAgent",
	"EdgeClient":       "EdgeClient",
	"RemoteClient":     "RemoteClient",
	"LocalClient":      "LocalClient",
	"ProvisionApi":     "ProvisionApi",
	"DataServices":     "DataServices",
	"UnitTest":         "UnitTest",
	"BaseHttpsServer":  "BaseHttpsServer",
	"SNIServer":        "SNIServer",
	"BeameSDKlauncher": "BeameSDKlauncher",
	"ProxyClient":      "ProxyClient",
	"Tunnel":           "Tunnel"
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
	"EntityMetadataKeys":          ["fqdn", "parent_fqdn","name", "email","level","local_ip"],
	"EntityCreateResponseKeys":    ["fqdn"],
	"DeveloperCreateResponseKeys": ["hostname", "uid", "name", "email"],
	"AtomCreateResponseKeys":      ["hostname", "uid", "name", "parent_fqdn", "edgeHostname"],
	"EdgeClientResponseKeys":      ["uid", "hostname", "edgeHostname", "parent_fqdn"],
	"LocalClientResponseKeys":     ["uid", "hostname", "parent_fqdn", "edge_client_fqdn", "local_ip"],
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

/**
 * Atom type values
 *  @enum {number}
 */
var AtomType = {
	"Default":              0,
	"AuthenticationServer": 1,
	"AuthorizationServer":  2
};

/**
 * Atom request types
 *  @enum {string}
 */
var AtomServerRequests = {
	"GetHost":                 "getHost",
	"GetHostsForLocalClients": "GetHostsForLocalClients",
	"AuthorizeToken":          "authorizeToken",
	"SignAuthToken":           "signAuthToken"
};

var SNIServerPort = (process.env.SNI_SERVER_PORT > 0 && process.env.SNI_SERVER_PORT < 65536) ? process.env.SNI_SERVER_PORT : 0;

module.exports = {
	rootDir,
	npmRootDir,
	localCertsDirV1,
	localCertsDirV2,
	remoteCertsDirV1,
	remotePKsDirV1,
	loadBalancerURL,
	metadataFileName,
	s3MetadataFileName,
	CertFileNames,
	CertificateFiles,
	CertResponseFields,
	AppModules,
	MessageCodes,
	ResponseKeys,
	TimeUnits,
	AtomType,
	AtomServerRequests,
	SNIServerPort,
	AuthServerEndPoint,
	AuthorizationAtomFqdn,
	AuthenticationAtomFqdn,
	PKsFileName,
	CertEndpoint,
	InitFirstRemoteEdgeClient,
	PinAtomPKbyDefault,
	CredentialStatus,
	SecurityPolicy,
	IdentityType,
	beameZeroLevelAuthData,
	MetadataProperties
};
