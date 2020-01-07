var gulp  = require('gulp');
var jsdoc = require('gulp-jsdoc3');


gulp.task('doc', function (cb) {

	var config = {
		"opts": {
			"destination": '../beame-sdk-manual/'
		},
		"templates":{
			"theme" : "cerulean"
		}
	};

	gulp.src(['JSDOC_README.md', './src/cli/crypto.js', './src/cli/creds.js', './src/cli/servers.js', './src/cli/token.js', './src/cli/system.js', './src/services/Credential.js', './src/services/BeameStoreV2.js'], {read: true})
		.pipe(jsdoc(config, cb));
});
