/**
 * Created by zenit1 on 04/07/2016.
 */
/** @const {String} **/
global.metadataFileName = "metadata.json";

/** @const {String} **/
global.apiUIDTemplatePattern = "{{UID}}";


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
    "OpenSSLError" : "OpenSSLError",
    "ApiRestError" : "ApiRestError",
    "HostnameRequired" : "HostnameRequired",
    "MetadataEmpty" : "MetadataEmpty",
    "NodeFolderNotExists" : "NodeFolderNotExists",
    "NodeFilesMissing" : "NodeFilesMissing",
    "CSRCreationFailed" : "CSRCreationFailed"
};