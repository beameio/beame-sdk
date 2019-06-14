"use strict";

const assert = require('assert').strict;
const makeEnv = require('../../src/utils/makeEnv');

describe('makeEnv', () => {
	it('should pick the right environment', function(done) {
		const e = makeEnv({a: {x: 'ax'}, b: {x: 'bx'}}, {env: 'a'});
		assert.equal(e.x, 'ax');
		done();
	});

	it('should allow overriding using environment variable', function(done) {
		process.env.BEAME_X = 'cx';
		const e = makeEnv({a: {x: 'ax'}, b: {x: 'bx'}}, {env: 'a'});
		assert.equal(e.x, 'cx');
		done();
	});

	it('should protect specified variables', function(done) {
		process.env.BEAME_X = 'cx';
		const e = makeEnv({a: {x: 'ax'}, b: {x: 'bx'}}, {env: 'a', protectedProperties: ['x']});
		assert.equal(e.x, 'ax');
		done();
	});

	it('brings common settings', function(done) {
		process.env.BEAME_X = 'cx';
		const e = makeEnv({_COMMON: {r: 'ee'}, a: {x: 'ax'}, b: {x: 'bx'}}, {env: 'a', protectedProperties: ['x']});
		assert.equal(e.x, 'ax');
		assert.equal(e.r, 'ee');
		done();
	});

	it('only common settings', function(done) {
		process.env.BEAME_X = 'cx';
		const e = makeEnv({_COMMON: {r: 'ee'}, a: {x: 'ax'}, b: {x: 'bx'}}, {env: 'not_existing', protectedProperties: ['x']});
		assert.equal(e.x, undefined);
		assert.equal(e.r, 'ee');
		done();
	});
});
