/**
 * Created by zenit1 on 04/07/2016.
 */
/** @const {String} **/
global.metadataFileName = "metadata.json";

/** @const {String} **/
global.apiUIDTemplatePattern = "{{UID}}";

/** @const {String} **/
global.loadBalancerEdnpoint = "http://lb-dev.luckyqr.io";

/**
 * Certificate file names
 *  @enum {string}
 */
global.CertFileNames = {
    "PRIVATE_KEY": "private_key.pem",
    "X509": "x509.pem",
    "CA": "ca.pem",
    "PKCS7": "pkcs7.pem"
};

global.authData = {
   "PK_PATH" : "/authData/pk.pem",
    "CERT_PATH" : "/authData/x509.pem"
};

/**
 * System Modules
 *  @enum {string}
 */
global.AppModules = {
    "Developer": "Developer",
    "Atom": "Atom",
    "EdgeClient": "EdgeClient",
    "ProvisionApi": "ProvisionApi",
    "DataServices": "DataServices"
};

/**
 * Message Codes
 *  @enum {string}
 */
global.MessageCodes = {
    "DebugInfo" : "DebugInfo",
    "EdgeLbError" : "EdgeLbError",
    "OpenSSLError" : "OpenSSLError",
    "ApiRestError" : "ApiRestError",
    "HostnameRequired" : "HostnameRequired",
    "MetadataEmpty" : "MetadataEmpty",
    "NodeFolderNotExists" : "NodeFolderNotExists",
    "NodeFilesMissing" : "NodeFilesMissing",
    "CSRCreationFailed" : "CSRCreationFailed"
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
