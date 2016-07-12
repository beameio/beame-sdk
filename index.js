module.exports = {
    BeameCertStore: require("./src/services/BeameStore.js"),
    BeameDirServices: require("./src/services/BeameDirServices.js"),
    sampleNodeServer: require("./src/services/BaseHttpsServer.js"),
    provisionApiServices: require("./src/services/ProvisionApi"),
    developerCervices: require('./src/core/DeveloperServices'),
    atomServices: require('./src/core/AtomServices'),
    edgeClientServices: require('./src/core/EdgeClientServices'),
    crypto: require('./src/cli/crypto'),
    beameUtils: require('./src/utils/BeameUtils'),
    socketUtils: require('./src/utils/SocketUtils'),
    proxyClient : require("./src/services/ProxyClient")
};
