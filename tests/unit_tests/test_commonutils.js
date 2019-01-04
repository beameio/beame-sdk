
const assert = require('assert').strict;
const commonUtils = require('../../src/utils/CommonUtils');
const simple = require('simple-mock');
const debug = require("debug")("test_commonutils");

describe('exponentialTimeWithJitter tests', () => {
	it('default ', () => {
		let base = 0;
		for(let i = 0; i <= 20; i++) {
			const n = commonUtils.exponentialTimeWithJitter(i);
			debug(`${i}: ${n}`);
			assert(n > base);
			base = n;
		}
	});

	it('attempt 0 with jitter bigger than 0, result is bigger than 0', () => {
		let min = 10;
		for(let i = 0; i<=50; i++) {
			const n0 = commonUtils.exponentialTimeWithJitter(0, min);
			debug(n0);
			assert(n0 > 0);
		}
	});

	it('min 0 all 0', () => {
		for(let i = 0; i<=50; i++) {
			const n0 = commonUtils.exponentialTimeWithJitter(i, 0);
			debug(n0);
			assert.equal(n0, 0);
		}
	});

	it('no jitter leaves the exponential', () => {
		let min = 100;
		let factor = 2;
		for(let i = 0; i <= 20; i++) {
			const n = commonUtils.exponentialTimeWithJitter(i, min, 0, factor, 0);
			debug(`${i}: ${n}`);
			assert.equal(n, min * Math.pow(factor, i));
		}
	});

	it('max respected', () => {
		let min = 100;
		let max = 20000;
		let n = 0;
		for(let i = 0; i <= 12; i++) {
			n = commonUtils.exponentialTimeWithJitter(i, min, max);
			debug(`${i}: ${n}`);
		}
		assert.equal(n, max);
	});

});


describe('retry tests', () => {
	it('ok function, no retry', async () => {
		const fn = simple.stub().returnWith(true);
		const result = await commonUtils.retry(fn);
		assert.equal(fn.callCount, 1);
		assert(result);
	});

	it('bad function with wait', async () => {
		const retries = 2;
		const errorMessage = "error on retry func";
		const fn = simple.stub().throwWith(new Error(errorMessage));
		try {
			await commonUtils.retry(fn, retries);
			assert.fail("Should have failed");
		}
		catch(e) {
			assert.equal(e.message, errorMessage);
			assert.equal(fn.callCount, retries);
		}
	});

	it('bad function without wait', async () => {
		const retries = 10;
		const errorMessage = "error on retry func";
		const fn = simple.stub().throwWith(new Error(errorMessage));
		try {
			await commonUtils.retry(fn, retries,false);
			assert.fail("Should have failed");
		}
		catch(e) {
			assert.equal(e.message, errorMessage);
			assert.equal(fn.callCount, retries);
		}
	});

	it('bad function that turns good without wait', async () => {
		const retries = 10;
		const errorMessage = "error on retry func";

		let fncalled = 0;
		const fn = simple.stub().callFn(function() {
			if(fncalled < 7) {
				fncalled++;
				throw new Error(errorMessage);
			}
			return true;
		});

		const result = await commonUtils.retry(fn, retries,false);
		assert.equal(fn.callCount, fncalled+1);
		assert(result);
	});
});