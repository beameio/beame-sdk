/**
 * @type {BeameStoreV2}
 */
const store = (require("./BeameStoreV2")).getInstance();

function renewCredential(fqdn) {
	store.find(fqdn, false);
}

renewCredential('xx.beameio.net');
