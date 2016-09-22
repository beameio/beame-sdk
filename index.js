module.exports = {
	creds:             require('./src/cli/creds'),
	crypto:            require('./src/cli/crypto'),

	AuthToken:         require('./src/services/AuthToken'),
	BeameServer:       require('./src/services/BeameServer'),
	BeameStore:        require('./src/services/BeameStoreV2'),
	BeameUtils:        require('./src/utils/BeameUtils'),
	CommonUtils:       require('./src/utils/CommonUtils'),
	Credential:        require('./src/services/Credential'),
	DirectoryServices: require('./src/services/DirectoryServices'),
	EC2AuthInfo:       require('./src/services/EC2AuthInfo'),
	Logger:            require('./src/utils/Logger'),
	ProvApi:           require('./src/services/ProvisionApi')
};

