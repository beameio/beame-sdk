module.exports = {
        // devCreate : require("./src/devCreate.js"), //  <developerName>
        // devGetCert : require("./src/devGetCert.js"),
        // devProfileUpdate : require("./src/devProfileUpdate.js"),
        // devAppSave : require("./src/devAppSave.js"),
        // devAppGetCert : require("./src/devAppGetCert.js"),
        // edgeClientRegister : require("./src/edgeClientRegister.js"),
        // edgeClientGetCert : require("./src/edgeClientGetCert.js"),
        BeameCertStore: require("./src/services/BeameStore.js"),
		BeameDirServices : require("./src/services/BeameDirServices.js"),
		sampleNodeServer : require("./src/samples/testHttpsServer.js"),
        provisionApiServices :require("./src/services/ProvisionApi"),
        developerCervices : require('./src/core/DeveloperServices'),
        atomServices : require('./src/core/AtomServices'),
        edgeClientServices : require('./src/core/EdgeClientServices')
//        authDataCollection : require("./src/BeameDirServices.js")
};
