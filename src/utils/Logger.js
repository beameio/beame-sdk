/**
 * Created by zenit1 on 06/08/2016.
 */
"use strict";

const util        = require('util');
const log4js      = (require('./Log4js')).getInstance();
const CommonUtils = require('../utils/CommonUtils');
const LogLevel    = {
	"Info":  "INFO",
	"Debug": "DEBUG",
	"Warn":  "WARN",
	"Error": "ERROR",
	"Fatal": "FATAL"
};

// Pitfall alert: "INFO" is how the regular messages of interest to the user are printed.
// Pitfall alert: printStandardEvent() prints at "INFO" and it doesn't seem to be controlled
//                using the BEAME_LOG_LEVEL environment variable, so it's printing anyway.
const LogLevelVerbosity = {
	"INFO":  0,
	"DEBUG": 4,
	"WARN":  3,
	"ERROR": 2,
	"FATAL": 1
};


const StandardFlowEvent = {
	"Registering":       "Registering",
	"Registered":        "Registered",
	"RequestingCerts":   "RequestingCerts",
	"ReceivedCerts":     "ReceivedCerts",
	"GettingAuthCreds":  "GettingAuthCreds",
	"AuthCredsReceived": "AuthCredsReceived",
	"GeneratingKeys":    "GeneratingKeys",
	"KeysCreated":       "KeysCreated",
	"UpdatingMetadata":  "UpdatingMetadata",
	"MetadataUpdated":   "MetadataUpdated"
};
/**
 * @typedef {Object} LoggerMessage
 * @param {LogLevel} level
 * @param {String} module
 * @param {String} code
 * @param {String} message
 * @param {Object} data
 */


class BeameLogger {


	constructor(module) {
		this._module = '';

		if (module) {
			this._module = module;
		}

		this._logger = log4js.getLogger(this._module);

		/** @member {LogLevel} **/
		this.currentLogLevel = process.env.BEAME_LOG_LEVEL || LogLevel.Error;
	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 *
	 * @param {Object|Error|String} error
	 * @returns {*|string|String}
	 */
	static formatError(error) {
		if (error instanceof Error) {
			return error.message;
		}
		let type = typeof error;
		switch (type) {
			case 'object':
				if (error instanceof Error) {
					return error.message || error.toString();
				}

				if (error.message) {
					return error.message;
				}

				return CommonUtils.isObjectEmpty(error) ? CommonUtils.stringify(error) : error.toString();
			case 'array':
				return error[0].toString();
			default:
				return error ? error.toString() : 'Unexpected error';
		}
	}

	/**
	 *
	 * @param {String} message
	 * @param {String|null} [module]
	 * @param {Object|null|undefined} [data]
	 * @param {String|null|undefined} [error_code]
	 * @param {Number|null|undefined} [status]
	 * @returns {typeof LoggerMessage}
	 */
	formatErrorMessage(message, module, data, error_code, status) {
		return {
			message,
			_module: module || this._module,
			data,
			code:    error_code,
			status
		}
	}

	/**
	 *
	 * @param {String} level
	 * @param {Object} logMessage
	 */
	printLogMessage(level, logMessage) {

		let shouldPrint = () => {
			return LogLevelVerbosity[level] <= LogLevelVerbosity[this.currentLogLevel];
		};

		if (!shouldPrint()) return;

		let message_logger = logMessage.module ? log4js.getLogger(logMessage.module) : this._logger;

		message_logger[level.toLocaleLowerCase()](logMessage.message);

		if(logMessage.data){
			message_logger[level.toLocaleLowerCase()](logMessage.data);
		}

		if(level == LogLevel.Fatal) {
			process.exit(1);
		}
	}

	/**
	 *
	 * @param {String} entity
	 * @param {String} event
	 * @param {String} fqdn
	 */
	printStandardEvent(entity, event, fqdn) {

		let message;
		switch (event) {
			case StandardFlowEvent.Registering:
				message = `Registering new ${entity.toLowerCase()} under ${fqdn} ...`;
				break;
			case StandardFlowEvent.Registered:
				message = `${entity} ${fqdn} registered successfully ...`;
				break;
			case StandardFlowEvent.RequestingCerts:
				message = `Requesting certificates for ${entity.toLowerCase()} ${fqdn} ...`;
				break;
			case StandardFlowEvent.ReceivedCerts:
				message = `${entity} ${fqdn} certificates received, saving to disk ...`;
				break;
			case StandardFlowEvent.GettingAuthCreds:
				message = `${entity} retrieving auth server creds of ${fqdn}...`;
				break;
			case StandardFlowEvent.AuthCredsReceived:
				message = `${entity} auth server creds received for ${fqdn} ...`;
				break;
			case StandardFlowEvent.GeneratingKeys:
				message = `${entity} generating Key Pair on ${fqdn}...`;
				break;
			case StandardFlowEvent.KeysCreated:
				message = `${entity} Key Pair for ${fqdn} created successfully...`;
				break;
			case StandardFlowEvent.UpdatingMetadata:
				message = `${entity} updating metadata ${fqdn}...`;
				break;
			case StandardFlowEvent.MetadataUpdated:
				message = `${entity} metadata for ${fqdn} updated successfully...`;
				break;
			default:
				return;
		}

		this._logger.info(message);
	}

	/**
	 * @param {String} message
	 * @param {Object|null|undefined} [data]
	 */
	info(message, data) {
		/** @type {typeof LoggerMessage} **/
		let log = {
			message,
			data
		};

		this.printLogMessage(LogLevel.Info, log);
	}

	/**
	 * @param {String} message
	 * @param {Object|null|undefined} [data]
	 */
	debug(message, data) {
		/** @type {typeof LoggerMessage} **/
		let log = {
			message,
			data
		};

		this.printLogMessage(LogLevel.Debug, log);
	}

	/**
	 * @param {String} message
	 * @param {Object|null|undefined} [data]
	 */
	warn(message, data) {
		/** @type {typeof LoggerMessage} **/
		let log = {
			message,
			data
		};

		this.printLogMessage(LogLevel.Warn, log);
	}

	/**
	 * @param {String|Error} message
	 * @param {Object|null|undefined} [data]
	 */
	error(message, data) {
		/** @type {typeof LoggerMessage} **/
		let log = {
			message,
			data
		};

		if (message instanceof Error) {
			message.stack.split('\n').forEach(line => this.error(line, null));
		} else {
			this.printLogMessage(LogLevel.Error, log);
		}
	}

	/**
	 * @param {String} message
	 * @param {Object|null|undefined} [data]
	 */
	fatal(message, data) {
		/** @type {typeof LoggerMessage} **/
		let log = {
			message,
			data
		};

		this.printLogMessage(LogLevel.Fatal, log);
	}


	//noinspection JSUnusedGlobalSymbols
	static get LogLevel() {
		return LogLevel
	}


	static get StandardFlowEvent() {
		return StandardFlowEvent
	}
}


module.exports = BeameLogger;

