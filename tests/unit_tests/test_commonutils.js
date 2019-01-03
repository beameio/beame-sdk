
const assert = require('assert');
const commonUtils = require('../../src/utils/CommonUtils');

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