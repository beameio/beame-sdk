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
});
