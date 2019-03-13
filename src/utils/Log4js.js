"use strict";

const path   = require('path');
const Config = require('../../config/Config');

/**
 * Roll strategy for events
 * @readonly
 * @enum {String}
 */
const LogRollingStrategy = {
	"Hour": {
		"name":    "Hourly",
		"pattern": ".yyyy-MM-dd-hh.log"
	},
	"Day":  {
		"name":    "Daily",
		"pattern": ".yyyy-MM-dd.log"
	}
};


/**
 * @typedef {Object} Log4JsOptions
 * @property {String|null} [cdr_path]
 * @property {String|null} [cdr_file_name]
 * @property {LogRollingStrategy|null} [cdr_roll_strategy]
 */

class Log4Js {

	/**
	 * @param {Log4JsOptions} options
	 */
	constructor(options) {

		this._log4js     = require('log4js');
		const jsonLayout = require('log4js-json-layout');
		this._log4js.addLayout('json', jsonLayout);

		/** @type {Log4JsOptions} **/
		this._options = options;

		let config = require('../../config/Log4js.json');

		config.appenders.cdr.filename = path.join(this._options.cdr_path, this._options.cdr_file_name);
		config.appenders.cdr.pattern  = this._options.cdr_roll_strategy.pattern;

		config.appenders.file.filename = path.join(this._options.log_path, this._options.log_file_name);
		config.appenders.file.pattern = this._options.log_roll_strategy.pattern;

		if(process.env.BEAME_LOG_TO_FILE && process.env.BEAME_LOG_TO_FILE.toLowerCase() === "true") {
			config.categories.default.appenders.push("file");
		}

		this._log4js.configure(config);
	}

	get logger() {
		return this._log4js;
	}

}

let _log4jsInstance = null;

module.exports = {
	/**
	 * @param {Log4JsOptions|undefined} [_options]
	 */
	init: function (_options) {
		/** @type {Log4JsOptions} **/
		let _default_options = {
			cdr_path:          Config.cdrDir,
			cdr_file_name:     'cdr',
			cdr_roll_strategy: LogRollingStrategy.Day,
			log_path:          Config.localLogDir,
			log_file_name:     'log',
			log_roll_strategy: LogRollingStrategy.Day
		};

		let options = Object.assign({}, _default_options, _options);

		_log4jsInstance = new Log4Js(options);
	},

	getInstance: function () {

		if (_log4jsInstance == null) {
			this.init();
		}

		return _log4jsInstance.logger;
	},

	LogRollingStrategy
};

