'use strict';
var path = require('path');
var os   = require('os');
var npmPrefix = require('npm-prefix');
var home = os.homedir();

const AuthServerEndPoint = "https://registration.beameio.net";

const CertEndpoint = "https://beameio-net-certs.s3.amazonaws.com";

const AuthorizationAtomFqdn = "q42e67f142vaz8up.tr86t6ghqvoxtj516ku6krz3y8f6fm4b.v1.beameio.net";
const AuthenticationAtomFqdn = "brfgbn2alitzkpkg.tr86t6ghqvoxtj516ku6krz3y8f6fm4b.v1.beameio.net";
const InitFirstRemoteEdgeClient = true;
const PinAtomPKbyDefault = false;
const beameStoreNdxRoot = 1;
const beameStoreNdxHome = 0;
const npmRootDir = npmPrefix();

const certDirNdx = [beameStoreNdxHome, beameStoreNdxRoot];
var rootDirIndex = 0;
/** @const {String} **/
var rootDir = [process.env.BEAME_DIR || path.join(home, '.beame'),path.join(npmRootDir, '.beame')];

/** @const {String} **/
var localCertsDir = [path.join(rootDir[beameStoreNdxHome], 'v1', 'local'), path.join(rootDir[beameStoreNdxRoot], 'v1', 'local')];

/** @const {String} **/
var remoteCertsDir = [path.join(rootDir[beameStoreNdxHome], 'v1', 'remote'), path.join(rootDir[beameStoreNdxRoot], 'v1', 'remote')];

/** @const {String} **/
var remotePKsDir = [path.join(rootDir[beameStoreNdxHome], 'pki'),path.join(rootDir[beameStoreNdxRoot], 'pki')];

/** @const {String} **/
var loadBalancerURL = process.env.BEAME_LB || "http://lb.beameio.net/";

/** @const {String} **/
var metadataFileName = "metadata.json";

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
	"PRIVATE_KEY":      "private_key.pem",
	"X509":             "x509.pem",
	"CA":               "ca.pem",
	"PKCS7":            "pkcs7.pem",
	"P7B":              "p7b.cer",
	"PKCS12":           "cert.pfx",
	"PWD":              "pwd.txt"
};

var CREDENTIAL_STATUS = {
	PRIVATE_KEY 	, 1 << 1,
	CERT            , 1 << 2,
	BEAME_ISSUED_CERT		: 1 << 3,
	NON_BEAME_CERT 		: 1 << 4,
	EMPTY_DIR             : 1 << 5,
	DIR_NOTREAD           : 1 << 6
}

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
	"BeameSDKCli": "BeameSDKCli",
	"BeameCreds": "BeameCreds",
	"BeameCrypto": "BeameCrypto",
	"BeameServer": "BeameServer",
	"BeameUtils": "BeameUtils",
	"BeameStore": "BeameStore",
	"BeameSystem": "BeameSystem",
	"BeameDirServices": "BeameDirServices",
	"Developer": "Developer",
	"Atom": "Atom",
	"AtomAgent": "AtomAgent",
	"EdgeClient": "EdgeClient",
	"RemoteClient": "RemoteClient",
	"LocalClient": "LocalClient",
	"ProvisionApi": "ProvisionApi",
	"DataServices": "DataServices",
	"UnitTest": "UnitTest",
	"BaseHttpsServer": "BaseHttpsServer",
	"SNIServer": "SNIServer",
	"BeameSDKlauncher": "BeameSDKlauncher",
	"ProxyClient": "ProxyClient"
};

/**
 * Message Codes
 *  @enum {string}
 */
var MessageCodes = {
	"DebugInfo": "DebugInfo",
	"EdgeLbError": "EdgeLbError",
	"OpenSSLError": "OpenSSLError",
	"ApiRestError": "ApiRestError",
	"HostnameRequired": "HostnameRequired",
	"MetadataEmpty": "MetadataEmpty",
	"NodeFolderNotExists": "NodeFolderNotExists",
	"NodeFilesMissing": "NodeFilesMissing",
	"CSRCreationFailed": "CSRCreationFailed",
	"InvalidPayload": "InvalidPayload"
};


var ResponseKeys = {
	"NodeFiles": [metadataFileName, CertFileNames.PRIVATE_KEY, CertFileNames.X509, CertFileNames.CA, CertFileNames.PKCS7, CertFileNames.P7B, CertFileNames.PKCS12, CertFileNames.PWD],
	"DeveloperCreateResponseKeys": ["hostname", "uid", "name", "email"],
	"AtomCreateResponseKeys": ["hostname", "uid", "name", "parent_fqdn", "edgeHostname"],
	"EdgeClientResponseKeys": ["uid", "hostname", "edgeHostname", "parent_fqdn"],
	"LocalClientResponseKeys": ["uid", "hostname", "parent_fqdn", "edge_client_fqdn", "local_ip"],
	"CertificateResponseKeys": ["x509", "pkcs7", "ca"],
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

/**
 * Atom type values
 *  @enum {number}
 */
var AtomType = {
	"Default": 0,
	"AuthenticationServer": 1,
	"AuthorizationServer": 2
};

/**
 * Atom request types
 *  @enum {string}
 */
var AtomServerRequests = {
	"GetHost": "getHost",
	"GetHostsForLocalClients": "GetHostsForLocalClients",
	"AuthorizeToken": "authorizeToken",
	"SignAuthToken": "signAuthToken"
};

var SNIServerPort = (process.env.SNI_SERVER_PORT > 0 && process.env.SNI_SERVER_PORT < 65536) ? process.env.SNI_SERVER_PORT : 0;

module.exports = {
	npmRootDir,
	certDirNdx,
	beameStoreNdxRoot,
	beameStoreNdxHome,
	rootDirIndex,
	rootDir,
	localCertsDir,
	remoteCertsDir,
	remotePKsDir,
	loadBalancerURL,
	metadataFileName,
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
	PinAtomPKbyDefault
};
