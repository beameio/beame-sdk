module.exports = {
	devCreate : require("./src/devCreate.js"), //  <developerName>
        devGetCert : require("./src/devGetCert.js"),
        devProfileUpdate : require("./src/devProfileUpdate.js"),
        devAppSave : require("./src/devAppSave.js"),
        devAppGetCert : require("./src/devAppGetCert.js"),
        edgeClientRegister : require("./src/edgeClientRegister.js"),
        edgeClientGetCert : require("./src/edgeClientGetCert.js"),
        scanBeameDir : require("./src/collectAuthData.js")
//        authDataCollection : require("./src/collectAuthData.js")
};
