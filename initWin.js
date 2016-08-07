'use strict';

const os   = require('os');
const path = require('path');

if(os.platform() == 'win32') {
    const opensslPath = 'C:\\OpenSSL-Win64\\bin';
	let locations = process.env.Path.split(path.delimiter);
    if(locations.indexOf(opensslPath) == -1) {
        locations.push(opensslPath);
        process.env.Path = locations.join(path.delimiter);
    }
}
