/**
 * Created by zenit1 on 12/07/2016.
 */
"use strict";

const _           = require('underscore');
const net         = require('net');
const io          = require('socket.io-client');
const authToken   = require('./AuthToken');
const CommonUtils = require('../utils/CommonUtils');
const socketUtils = require('../utils/SocketUtils');
const config      = require('../../config/Config');
const module_name = config.AppModules.ProxyClient;
const BeameLogger = require('../utils/Logger');
const logger      = new BeameLogger(module_name);
/**
 * @typedef {Object} HttpsProxyAgent
 */

function nop() {
}

/**
 * @typedef {Object} ProxyClientOptions
 * @property {Function} [onConnect]
 * @property {Function} [onLocalServerCreated]
 */

class ProxyClient {

	/**
	 * @param {String} serverType
	 * @param {Credential} serverCred - server credential
	 * @param {String} targetHost
	 * @param {Number} targetPort
	 * @param {ProxyClientOptions} options
	 * @param {HttpsProxyAgent|null|undefined} [agent]
	 * @param {ServerCertificates|null} [edgeClientCerts]
	 * @constructor
	 * @class
	 */
	constructor(serverType, serverCred, targetHost, targetPort, options, agent, edgeClientCerts) {

		/** @member {Boolean} */
		this._connected = false;

		/** @member {Object} */
		this._clientSockets = {};

		this._type = serverType;

		/**
		 * SSL Proxy Server endpoint url
		 * @member {String} */
		this._edgeServerHostname = null;

		this._cred = serverCred;

		/**
		 * server endpoint url
		 * @member {String} */
		this._srvFqdn = serverCred.fqdn;

		/** @member {String} */
		this._targetHost = targetHost;

		/** @member {Number} */
		this._targetPort = targetPort;

		//logger.debug(`ProxyClient connecting to ${this.edgeServerHostname}`);

		this._options = options;

		/**
		 * Connect to ProxyServer
		 */
		let io_options = {multiplex: false, agent: agent};

		if (edgeClientCerts) {
			io_options.cert = edgeClientCerts.cert;
			io_options.key  = edgeClientCerts.key;
		}

		this._ioOptions = io_options;

	}

	start() {

		return new Promise((resolve, reject) => {
				this._cred.getDnsValue().then(value => {
					this._edgeServerHostname = value;

					this._initSocket();

					resolve()

				}).catch(e => {
					logger.error(`Get dns error for ${this._srvFqdn} ${BeameLogger.formatError(e)}. SERVER NOT STARTED`);
					reject(e);
				})
			}
		);
	}

	_initSocket() {
		//noinspection JSUnresolvedVariable

		this._socketio = io.connect(this._edgeServerHostname + '/control', this._ioOptions);

		this._socketio.on('connect', () => {

			if (this._connected) {
				return;
			}

			this._connected = true;

			let token = authToken.create(this._srvFqdn, this._cred, 60);
logger.debug('register_server');
			socketUtils.emitMessage(this._socketio, 'register_server', socketUtils.formatMessage(null, {
				hostname:  this._srvFqdn,
				type:      this._type,
				isSigned:  true,
				signature: token
			}));

			this._options && this._options.onConnect && this._options.onConnect();

		});

		this._socketio.on('error', (err) => {
			//logger.debug("Could not connect to proxy server", err);
		});

		this._socketio.on('hostRegisterFailed', (error) => {
			logger.debug('hostRegisterFailed');
			try {
				let parsed = CommonUtils.parse(error);

				if (parsed.code) {
					switch (parsed.code) {
						case 'signature':
							logger.error(`Host registration error ${parsed.message}`);
							break;
						case 'payload':
							break;
						case 'hostname':
						case 'subdomain':
						case 'panic':
							logger.error(`Host registration ${parsed.code} error ${parsed.message || ''}`);
							break;
						default:
							logger.error(`Host registration unknown code error ${parsed.message}`);
							break;
					}
				}
			}
			catch (e) {

			}
		});

		this._socketio.on('create_connection', data => {
			logger.debug('create_connection');
			//noinspection JSUnresolvedVariable
			this.createLocalServerConnection(data, this._options && this._options.onConnection);
		});

		this._socketio.once('hostRegistered', (data) => {
			logger.debug('hostRegistered');
			this._options && this._options.onLocalServerCreated && this._options.onLocalServerCreated.call(null, data);
			//  this.createLocalServerConnection.call(this, data, this._options && this._options.onLocalServerCreated);
			//logger.debug('hostRegistered', data);
		});

		this._socketio.on('data', (data) => {
			const socketId = data.socketId;
			const socket   = this._clientSockets[socketId];
			if (socket) {
				socket.id = socketId;
				//check if connected
				process.nextTick(function () {
					socket.write(data.payload);
				});

			}
		});

		this._socketio.on('socket_error', (data) => {
			this.deleteSocket(data.socketId);
		});

		this._socketio.on('_end', (data) => {
			//logger.debug("***************Killing the socket ");
			if (!data || !data.socketId) {
				return;
			}
			setTimeout(() => {
				this.deleteSocket(data.socketId);
			}, 1000);

		});

		this._socketio.on('disconnect', () => {

			this._connected = false;
			_.each(this._clientSockets, function (socket) {
				setTimeout(() => {
					socket.destroy();
					this.deleteSocket(socket.id);
				}, 10000);
			}, this);
		});
	}

	createLocalServerConnection(data, callback = nop) {
		if (!this._socketio) {
			return;
		}

		const serverSideSocketId = data.socketId;

		const client                            = new net.Socket();
		client.serverSideSocketId               = serverSideSocketId;
		this._clientSockets[serverSideSocketId] = client;

		/**
		 * Connect to local server
		 */
		client.connect(this._targetPort, this._targetHost);

		client.on('data', data => {
			socketUtils.emitMessage(this._socketio, 'data', socketUtils.formatMessage(client.serverSideSocketId, data));
		});

		client.on('close', had_error => {
			if (had_error) {
				socketUtils.emitMessage(this._socketio, '_error', socketUtils.formatMessage(client.serverSideSocketId, null, new Error('close() reported error')));
			}
			socketUtils.emitMessage(this._socketio, 'disconnect_client', socketUtils.formatMessage(client.serverSideSocketId));
			this.deleteSocket(serverSideSocketId);
		});

		client.on('error', error => {

			logger.error(`Error talking to ${this._targetHost}:${this._targetPort} - ${error}`);

			if (this._socketio) {
				// TODO: Send this event to be logged on edge server
				socketUtils.emitMessage(this._socketio, '_error', socketUtils.formatMessage(client.serverSideSocketId, null, error));
				if (error.syscall == 'connect' && error.code == 'ECONNREFUSED') {
					logger.error(`Error connecting to ${this._targetHost}:${this._targetPort} - ${error}. Closing socket.`);
					socketUtils.emitMessage(this._socketio, 'cut_client', socketUtils.formatMessage(client.serverSideSocketId));
					// client.emit('close'); -- did not work
					this.deleteSocket(serverSideSocketId);
					client.destroy();
				}
			}
		});

		callback(data);
	}

	//noinspection JSUnusedGlobalSymbols
	destroy() {
		if (this._socketio) {
			this._socketio = null;
		}
		return this;
	}

	deleteSocket(socketId) {
		if (socketId && this._clientSockets[socketId]) {
			const obj = this._clientSockets[socketId];
			obj.end();
			delete this._clientSockets[socketId];
		}
	}
}


module.exports = ProxyClient;

