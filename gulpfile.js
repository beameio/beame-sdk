/**
 * Created by zenit1 on 09/08/2016.
 */
var gulp = require('gulp');
var jsdoc = require('gulp-jsdoc3');


gulp.task('doc', function (cb) {
	gulp.src(['README.md', './src/core/*.js'], {read: true})
		.pipe(jsdoc(cb));
});