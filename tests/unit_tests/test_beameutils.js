"use strict";

const assert = require('assert').strict;
const beameUtils = require('../../src/utils/BeameUtils');
const sleep = require('util').promisify(setTimeout);

describe('background jobs', () => {
	const runningInterval = 15;
	const name = 'test123', name2 = 'test321';

	it('start/stopping job', () => {
		beameUtils.startBackgroundJob(name, () => {}, 2000);
		assert(beameUtils.getBackgroundJob(name) !== undefined);
		assert(beameUtils.getBackgroundJob(name).called === 0);
		assert(beameUtils.getBackgroundJob(name).interval === 2000);
		assert(beameUtils.getBackgroundJob(name).handle);
		beameUtils.stopBackgroundJob(name);
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('job runs multiple times', async () => {
		beameUtils.startBackgroundJob(name,() => {}, runningInterval);
		await sleep(runningInterval * 2.5);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		beameUtils.stopBackgroundJob(name);
	});

	it('correct running status', async () => {
		beameUtils.startBackgroundJob(name,async () => { await sleep(runningInterval)}, runningInterval);
		assert(beameUtils.getBackgroundJob(name).called === 0);
		await sleep(runningInterval*1.2);
		assert(beameUtils.getBackgroundJob(name).called === 1);
		assert(beameUtils.getBackgroundJob(name).running);
		await sleep(runningInterval*1.2);
		assert(!beameUtils.getBackgroundJob(name).running);
		beameUtils.stopBackgroundJob(name);
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('correct storing of return value', async () => {
		beameUtils.startBackgroundJob(name,async () => { return 'test_completed'}, runningInterval);
		await sleep(runningInterval*1.5);
		assert(beameUtils.getBackgroundJob(name).called === 1);
		assert(beameUtils.getBackgroundJob(name).lastRun.result === 'test_completed');
		assert(!beameUtils.getBackgroundJob(name).lastRun.error);
		assert(beameUtils.getBackgroundJob(name).lastRun.timestamp);
		beameUtils.stopBackgroundJob(name);
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('failing runs simple throw', async () => {
		beameUtils.startBackgroundJob(name,async () => { throw 'test_error'}, runningInterval);
		await sleep(runningInterval*2.5);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		assert(beameUtils.getBackgroundJob(name).lastRun.error === 'test_error');
		assert(beameUtils.getBackgroundJob(name).failed === 2);
		beameUtils.stopBackgroundJob(name);
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('failing runs error throw', async () => {
		beameUtils.startBackgroundJob(name,async () => { throw new Error('test_error')}, runningInterval);
		await sleep(runningInterval*2.5);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		assert(beameUtils.getBackgroundJob(name).lastRun.error.message === 'test_error');
		assert(beameUtils.getBackgroundJob(name).lastRun.error.stack);
		assert(beameUtils.getBackgroundJob(name).failed === 2);
		beameUtils.stopBackgroundJob(name);
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('conditional fail run', async () => {
		beameUtils.startBackgroundJob(name,async () => {
			if(beameUtils.getBackgroundJob(name).called === 1) {return 'test_completed'}
			else { throw new Error('test_error')}}, runningInterval);
		await sleep(runningInterval*1.5);
		assert(beameUtils.getBackgroundJob(name).called === 1);
		assert(beameUtils.getBackgroundJob(name).lastRun.result === 'test_completed');
		assert(!beameUtils.getBackgroundJob(name).lastRun.error);
		assert(beameUtils.getBackgroundJob(name).failed === 0);
		await sleep(runningInterval);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		assert(!beameUtils.getBackgroundJob(name).lastRun.result);
		assert(beameUtils.getBackgroundJob(name).lastRun.error.message === 'test_error');
		assert(beameUtils.getBackgroundJob(name).failed === 1);
		beameUtils.stopBackgroundJob(name);
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('can run multiple jobs simultaneously', () => {
		beameUtils.startBackgroundJob(name,() => {}, 2000);
		beameUtils.startBackgroundJob(name2,() => {}, 2000);
		assert(beameUtils.getBackgroundJob(name) !== undefined);
		assert(beameUtils.getBackgroundJob(name2) !== undefined);
		beameUtils.stopBackgroundJob(name);
		beameUtils.stopBackgroundJob(name2);
		assert(beameUtils.getBackgroundJob(name) === undefined);
		assert(beameUtils.getBackgroundJob(name2) === undefined);
	});

	it('can run multiple jobs simultaneously multiple times', async () => {
		beameUtils.startBackgroundJob(name,() => {}, runningInterval);
		beameUtils.startBackgroundJob(name2,() => {}, runningInterval);
		assert(beameUtils.getBackgroundJob(name).called === 0);
		assert(beameUtils.getBackgroundJob(name2).called === 0);
		await sleep(runningInterval*1.5);
		assert(beameUtils.getBackgroundJob(name).called === 1);
		assert(beameUtils.getBackgroundJob(name2).called === 1);
		await sleep(runningInterval);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		assert(beameUtils.getBackgroundJob(name2).called === 2);
		beameUtils.stopBackgroundJob(name);
		await sleep(runningInterval);
		assert(beameUtils.getBackgroundJob(name2).called === 3);
		assert(beameUtils.getBackgroundJob(name) === undefined);
		beameUtils.stopBackgroundJob(name2);
		assert(beameUtils.getBackgroundJob(name2) === undefined);
	});

	it('adding already existing job fails', () => {
		beameUtils.startBackgroundJob(name,() => {}, 2000);
		try {
			beameUtils.startBackgroundJob(name,() => {}, 2000);
			assert.fail("Should have failed");
		}
		catch (e) {
			assert(e && e.message, "error shouldn't be empty");
		}
		beameUtils.stopBackgroundJob(name);
	});

	it('stop non existing job fails', () => {
		try {
			beameUtils.stopBackgroundJob('nonexistingjob');
			assert.fail("Should have failed");
		}
		catch (e) {
			assert(e && e.message, "error shouldn't be empty");
		}
	});

	it('double stopping fails second time', () => {
		beameUtils.startBackgroundJob(name,() => {}, 2000);
		beameUtils.stopBackgroundJob(name);
		try {
			beameUtils.stopBackgroundJob(name);
			assert.fail("Should have failed");
		}
		catch (e) {
			assert(e && e.message, "error shouldn't be empty");
		}
	});

	it('info non existing job returns undefined', () => {
		assert(beameUtils.getBackgroundJob('nonexistingjob') === undefined);
	});
});
