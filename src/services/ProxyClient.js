/**
 * Created by zenit1 on 12/07/2016.
 */
"use strict";

var _   = require('underscore');
var net = require('net');
var io  = require('socket.io-client');

var socketUtils   = require('../utils/SocketUtils');
var config        = require('../../config/Config');
const module_name = config.AppModules.ProxyClient;
var logger        = new (require('../utils/Logger'))(module_name);
/**
 * @typedef {Object} HttpsProxyAgent
 */

/**
 * @typedef {Object} ProxyClientOptions
 * @property {Function} [onConnect]
 * @property {Function} [onLocalServerCreated]
 */

class ProxyClient {

	/**
	 * @param {String} serverType
	 * @param {String} edgeClientHostname - server endpoint url
	 * @param {String} edgeServerHostname - SSL Proxy Server endpoint url
	 * @param {String} targetHost
	 * @param {Number} targetPort
	 * @param {ProxyClientOptions} options
	 * @param {HttpsProxyAgent|null|undefined} [agent]
	 * @param {ServerCertificates|null} [edgeClientCerts]
	 * @constructor
	 * @class
	 */
	constructor(serverType, edgeClientHostname, edgeServerHostname, targetHost, targetPort, options, agent, edgeClientCerts) {

		/** @member {Boolean} */
		this.connected = false;

		/** @member {Object} */
		this.clientSockets = {};

		this.type = serverType;

		/**
		 * SSL Proxy Server endpoint url
		 * @member {String} */
		this.edgeServerHostname = edgeServerHostname;

		/**
		 * server endpoint url
		 * @member {String} */
		this.hostname = edgeClientHostname;

		/** @member {String} */
		this.targetHost = targetHost;

		/** @member {Number} */
		this.targetPort = targetPort;

		//logger.debug(`ProxyClient connecting to ${this.edgeServerHostname}`);

		/**
		 * Connect to ProxyServer
		 */

		var io_options = {multiplex: false, agent: agent};

		if (edgeClientCerts) {
			io_options.cert = edgeClientCerts.cert;
			io_options.key  = edgeClientCerts.key;
			io_options.ca   = edgeClientCerts.ca;

		}

		//noinspection JSUnresolvedVariable
		this.options  = options;

		this.socketio = io.connect(this.edgeServerHostname + '/control', io_options);

		this.socketio.on('connect', _.bind(function () {
			if (this.connected) {
				return;
			}
			//logger.debug(`ProxyClient connected => {hostname:${this.hostname}, endpoint:${this.edgeServerHostname}, targetHost:${this.targetHost}, targetPort: ${this.targetPort}}`);
			this.connected = true;
			socketUtils.emitMessage(this.socketio, 'register_server', socketUtils.formatMessage(null, {
				hostname: this.hostname,
				type:     this.type
			}));

			this.options && this.options.onConnect && this.options.onConnect();

		}, this));

		this.socketio.on('error', _.bind(function (err) {
			//logger.debug("Could not connect to proxy server", err);
		}, this));

		this.socketio.on('create_connection', data => {
			//noinspection JSUnresolvedVariable
			this.createLocalServerConnection(data, this.options && this.options.onConnection);
		});

		this.socketio.once('hostRegistered', _.bind(function (data) {
			this.options && this.options.onLocalServerCreated && this.options.onLocalServerCreated.call(null, data);
			//  this.createLocalServerConnection.call(this, data, this.options && this.options.onLocalServerCreated);
			//logger.debug('hostRegistered', data);
		}, this));

		this.socketio.on('data', _.bind(function (data) {
			var socketId = data.socketId;
			var socket   = this.clientSockets[socketId];
			if (socket) {
				socket.id = socketId;
				//check if connected
				process.nextTick(function () {
					socket.write(data.payload);
				});

			}
		}, this));

		this.socketio.on('socket_error', _.bind(function (data) {
			this.deleteSocket(data.socketId);
		}, this));

		this.socketio.on('_end', _.bind(function (data) {
			//logger.debug("***************Killing the socket ");
			if (!data || !data.socketId) {
				return;
			}
			setTimeout( () => {
				this.deleteSocket(data.socketId);
			},1000);

		}, this));

		this.socketio.on('disconnect', _.bind(function () {
			this.connected = false;
			_.each(this.clientSockets, function (socket) {
				setTimeout( ()=> {
					socket.destroy();
					this.deleteSocket(socket.id);
				},10000);
			}, this);
		}, this));
	}

	createLocalServerConnection(data, callback) {
		if (!this.socketio) {
			return;
		}

		var serverSideSocketId = data.socketId;

		var client                             = new net.Socket();
		client.serverSideSocketId              = serverSideSocketId;
		this.clientSockets[serverSideSocketId] = client;

		try {
			/**
			 * Connect to local server
			 */
			client.connect(this.targetPort, this.targetHost, _.bind(function () {

				client.on('data', _.bind(function (data) {
				  //	logger.debug('**********Client Proxy on client(Socket) data');
					socketUtils.emitMessage(this.socketio, 'data', socketUtils.formatMessage(client.serverSideSocketId, data));

				}, this));

				client.on('close', _.bind(function () {
					//logger.debug("Connection closed by server");
					socketUtils.emitMessage(this.socketio, 'disconnect_client', socketUtils.formatMessage(client.serverSideSocketId));

				}, this));

				client.on('end', _.bind(function () {
				   //logger.debug("Connection end by server");
					// this.socketio && this.socketio.emit('disconnect_client', {socketId: client.serverSideSocketId});
				}, this));
			}, this));

			client.on('error', error => {
				logger.error(`Error talking to ${this.targetHost}:${this.targetPort} - ${error}`);

				if (this.socketio) {
					// TODO: Send this event to be logged on edge server
					socketUtils.emitMessage(this.socketio, '_error', socketUtils.formatMessage(client.serverSideSocketId, null, error));
					if(error.syscall == 'connect' && error.code == 'ECONNREFUSED') {
						logger.error(`Error connecting to ${this.targetHost}:${this.targetPort} - ${error}. Closing socket.`);
						socketUtils.emitMessage(this.socketio, 'disconnect_client', socketUtils.formatMessage(client.serverSideSocketId));
						// client.emit('close'); -- did not work
						this.deleteSocket(serverSideSocketId);
						client.destroy();
					}
				}
			});

		} catch (e) {
			//noinspection ES6ModulesDependencies,NodeModulesDependencies
			logger.error(`Unexpected error when creating local connection ${e}`);
		}

		callback && callback(data);
	}

	destroy() {
		if (this.socketio) {
			this.socketio = null;
		}
		return this;
	}

	deleteSocket(socketId) {
		if (socketId && this.clientSockets[socketId]) {
			var obj = this.clientSockets[socketId];
			obj.end();
			delete this.clientSockets[socketId];
		}
	}
}


module.exports = ProxyClient;

