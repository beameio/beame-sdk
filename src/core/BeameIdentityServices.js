/**
 * Created by zenit1 on 30/08/2016.
 */
var config        = require('../../config/Config');
const module_name = config.AppModules.IdentityService;
var logger        = new (require('../utils/Logger'))(module_name);

class BeameIdentity {

	/**
	 *
	 * @param {IdentityType} type
	 * @param {String|null} [parent_fqdn]
	 * @param {Array.<SecurityPolicy>} [policies]
	 * @param {String|null} [name]
	 * @param {String|null} [email]
	 * @param {String|null} [local_ip]
	 */
	constructor(type, parent_fqdn, policies, name, email, local_ip) {

		this.type        = type;
		this.parent_fqdn = parent_fqdn;
		this.name        = name;
		this.email       = email;
		this.localIp     = local_ip;
		this.permissions = policies.map(cred=> this.permissions = this.permissions | cred);

		logger.info(`permissions set to ${this.permissions}`);
	}


	createTopLevelCredentials() {

	}

	createCredentials() {

	}


}

module.exports = Identity;