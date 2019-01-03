
const assert = require('assert');
const commonUtils = require('../../src/utils/CommonUtils');
const simple = require('simple-mock');

describe('exponentialTimeWithJitter tests', () => {
	it('default ', () => {
		let base = 0;
		for(let i = 0; i <= 20; i++) {
			const n = commonUtils.exponentialTimeWithJitter(i);
			console.log(`${i}: ${n}`);
			assert(n > base);
			base = n;
		}
	});

	it('attempt 0 with jitter bigger than 0, result is bigger than 0', () => {
		let min = 10;
		for(let i = 0; i<=50; i++) {
			const n0 = commonUtils.exponentialTimeWithJitter(0, min);
			console.log(n0);
			assert(n0 > 0);
		}
	});

	it('min 0 all 0', () => {
		for(let i = 0; i<=50; i++) {
			const n0 = commonUtils.exponentialTimeWithJitter(i, 0);
			console.log(n0);
			assert.strictEqual(n0, 0);
		}
	});

	it('no jitter leaves the exponential', () => {
		let min = 100;
		let factor = 2;
		for(let i = 0; i <= 20; i++) {
			const n = commonUtils.exponentialTimeWithJitter(i, min, 0, factor, 0);
			console.log(`${i}: ${n}`);
			assert.strictEqual(n, min * Math.pow(factor, i));
		}
	});

	it('max respected', () => {
		let min = 100;
		let max = 20000;
		let n = 0;
		for(let i = 0; i <= 12; i++) {
			n = commonUtils.exponentialTimeWithJitter(i, min, max);
			console.log(`${i}: ${n}`);
		}
		assert.strictEqual(n, max);
	});

});


describe('retry tests', () => {

	it('ok function, no retry', async () => {
		const fn = simple.stub().returnWith(true);
		const result = await commonUtils.retry(fn);
		assert.strictEqual(fn.callCount, 1);
		assert(result);
	});

	it('bad function with wait', async function() {
		this.timeout(10000);
		const retries = 2;
		const errorMessage = "error on retry func";
		const fn = simple.stub().throwWith(new Error(errorMessage));
		try {
			await commonUtils.retry(fn, retries);
			assert.fail("Should have failed");
		}
		catch(e) {
			assert.strictEqual(e.message, errorMessage);
			assert.strictEqual(fn.callCount, retries);
		}
	});

	it('bad function without wait', async function() {
		const retries = 10;
		const errorMessage = "error on retry func";
		const fn = simple.stub().throwWith(new Error(errorMessage));
		try {
			await commonUtils.retry(fn, retries,false);
			assert.fail("Should have failed");
		}
		catch(e) {
			assert.strictEqual(e.message, errorMessage);
			assert.strictEqual(fn.callCount, retries);
		}
	});

	it('bad function that turns good without wait', async function() {
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
		assert(result);
		assert.strictEqual(fn.callCount, fncalled+1);
	});
});