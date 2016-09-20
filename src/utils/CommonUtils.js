/**
 * Created by zenit1 on 20/09/2016.
 */
"use strict";

class CommonUtils {

	static timeStamp() {
		function pad(n) {
			return n < 10 ? "0" + n : n
		}

		let d     = new Date(),
		    dash  = "-",
		    colon = ":";

		return d.getFullYear() + dash +
			pad(d.getMonth() + 1) + dash +
			pad(d.getDate()) + " " +
			pad(d.getHours()) + colon +
			pad(d.getMinutes()) + colon +
			pad(d.getSeconds())
	}

	static stringify(obj, format) {
		//noinspection NodeModulesDependencies,ES6ModulesDependencies
		return format ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
	}
}

module.exports = CommonUtils;