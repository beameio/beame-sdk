"use strict";

const Log4Js = require('../../src/utils/Log4js');

let _cdr = null;

class CDR {

	constructor() {

		let _log4js = Log4Js.getInstance();

		this._logger = _log4js.getLogger('cdr');

		_cdr = this;
	}

	get logger() {
		return this._logger;
	}

	static getInstance() {
		if (_cdr == null){
			new CDR()
		}

		return _cdr.logger;
	}
}


module.exports = CDR;