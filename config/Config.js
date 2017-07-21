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


const CertEndpoint = "https://beameio-net-certs.s3.amazonaws.com";

const InitFirstRemoteEdgeClient = true;
const PinAtomPKbyDefault        = false;

const EnvProfile = {
	Name : 'Prod',
	FqdnPattern: '.p.'
};

/** @const {String} **/
const rootDir = process.env.BEAME_DIR || path.join(home, '.beame');


/** @const {String} **/
const remotePKsDirV1 = path.join(rootDir, 'pki');

const localCertsDirV2 = path.join(rootDir, 'v2');

const issuerCertsPath = path.join(rootDir, 'ocsp-cache');

/** @const {String} **/
const authServerURL = process.env.BEAME_AUTH_SRVR_URL || "https://ypxf72akb6onjvrq.ohkv8odznwh5jpwm.v1.p.beameio.net";

/** @const {String} **/
const loadBalancerURL = process.env.BEAME_LOAD_BALANCER_URL || "https://ioigl3wzx6lajrx6.tl5h1ipgobrdqsj6.v1.p.beameio.net";

const beameDevCredsFqdn = process.env.BEAME_DEV_CREDS_FQDN || "am53rz8o6cjsm0xm.gjjpak0yxk8jhlxv.v1.p.beameio.net";

const beameForceEdgeFqdn = process.env.BEAME_FORCE_EDGE_FQDN || "";

const beameForceEdgeIP = process.env.BEAME_FORCE_EDGE_IP || 0;

const defaultValidityPeriod = process.env.BEAME_CERT_VALIDITY_PERIOD || 60 * 60 * 24 * 365;

const defaultAllowedClockDiff = 100; //in seconds

const defaultAuthTokenTtl = defaultAllowedClockDiff;

const defaultTimeFuzz = 10;

const ocspCachePeriod = 1000 * 60 * 60 * 24 * 30;

/** @const {String} **/
const metadataFileName = "metadata.json";

/** @const {String} **/
const s3MetadataFileName = "metadata.json";

const ApprovedZones = ['beameio.net', 'beame.io'];

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
	"RequestWithFqdn":       "RequestWithFqdn",
	"RequestWithParentFqdn": "RequestWithParentFqdn",
	"RequestWithAuthServer": "RequestWithAuthServer",
};

const CredAction = {
	"Revoke":          "Revoke",
	"Renew":           "Renew",
	"SendByEmail":     "Send by email",
	"Download":        "Download",
	"VpnRootCreated":  "Set as VPN Root",
	"VpnRootDeleted":  "VPN Root Deleted",
	"ChildCreated":    "Child cred created",
	"RegTokenCreated": "Reg token created",
	"DnsSaved":        "Dns Saved",
	"DnsDeleted":      "Dns deleted",
	"OcspUpdate":      "OCSP status updated",
	"RolesUpdate":     "RolesUpdate"
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
};


const MetadataProperties = {
	LEVEL:         "level",
	FQDN:          "fqdn",
	UID:           "uid",
	NAME:          "name",
	PARENT_FQDN:   "parent_fqdn",
	APPROVER_FQDN: "approved_by_fqdn",
	PATH:          "path",
	DNS:           "dnsRecords",
	REVOKED:       "revoked",
	ACTIONS:       "actions",
	OCSP_STATUS:   "ocspStatus"
};

/**
 * Certificate response fields
 *  @enum {string}
 */
const CertResponseFields = {
	"x509": "x509",
	"p7b":  "p7b",
	"ca":   "ca"
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
	"EntityMetadataKeys":        ["fqdn", "parent_fqdn", "name", "email", "level"],
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
	CredAction,
	authServerURL,
	beameForceEdgeFqdn,
	beameForceEdgeIP,
	RegistrationSource,
	RequestType,
	ApprovedZones,
	defaultValidityPeriod,
	ocspCachePeriod,
	CertValidationError,
	defaultAllowedClockDiff,
	defaultAuthTokenTtl,
	defaultTimeFuzz
};
