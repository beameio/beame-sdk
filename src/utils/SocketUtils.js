/**
 * Created by zenit1 on 12/07/2016.
 */
/**
 * Local server response object
 * @typedef {Object} ProxyMessage
 * @property {String} socketId
 * @property {Object|null} [payload]  - dynamic payload.
 */

/**
 * define certificate read response
 * @typedef {Object} ServerCertificates
 * @property {File} key
 * @property {File} cert
 * @property {File} ca
 */

/**
 * @typedef {Object} HttpsProxyAgent
 */

/**
 * @typedef {Object} ProxyClientOptions
 * @property {Function} [onConnect]
 * @property {Function} [onLocalServerCreated]
 */

module.exports = {
	/**
	 * Common message formatter for proxy messaging system
	 * @param {String} socketId
	 * @param {Object|null|undefined} [payload]
	 * @param {Error|null|undefined} [error]
	 * @returns {ProxyMessage}
	 */
	formatMessage: function (socketId, payload, error) {
		return {
			socketId: socketId,
			payload:  payload || error
		};
	},

//noinspection JSUnusedGlobalSymbols
	/**
	 * common socket emitter of ProxyMessage on tick
	 * @param {Object} socket_io
	 * @param {String} eventName
	 * @param {ProxyMessage} message
	 */
	emitMessage: function (socket_io, eventName, message) {
		process.nextTick(function () {
			socket_io.emit(eventName, message);
		});
	}
};
