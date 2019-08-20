"use strict";

const assert = require('assert').strict;
const beameUtils = require('../../src/utils/BeameUtils');
const sleep = require('util').promisify(setTimeout);

describe('background jobs', () => {
	const runningInterval = 15;
	const name = 'test123', name2 = 'test321';

	it('start/stopping job', () => {
		assert(beameUtils.startBackgroundJob(name, () => {}, 2000));
		assert(beameUtils.getBackgroundJob(name) !== undefined);
		assert(beameUtils.getBackgroundJob(name).called === 0);
		assert(beameUtils.getBackgroundJob(name).interval === 2000);
		assert(beameUtils.getBackgroundJob(name).handle);
		assert(beameUtils.stopBackgroundJob(name));
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('job runs multiple times', async () => {
		assert(beameUtils.startBackgroundJob(name,() => {}, runningInterval));
		await sleep(runningInterval * 2.5);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		assert(beameUtils.stopBackgroundJob(name));
	});

	it('correct running status', async () => {
		assert(beameUtils.startBackgroundJob(name,async () => { await sleep(runningInterval)}, runningInterval));
		assert(beameUtils.getBackgroundJob(name).called === 0);
		await sleep(runningInterval*1.2);
		assert(beameUtils.getBackgroundJob(name).called === 1);
		assert(beameUtils.getBackgroundJob(name).running);
		await sleep(runningInterval*1.2);
		assert(!beameUtils.getBackgroundJob(name).running);
		assert(beameUtils.stopBackgroundJob(name));
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('correct storing of return value', async () => {
		assert(beameUtils.startBackgroundJob(name,async () => { return 'test_completed'}, runningInterval));
		await sleep(runningInterval*1.5);
		assert(beameUtils.getBackgroundJob(name).called === 1);
		assert(beameUtils.getBackgroundJob(name).lastRun.result === 'test_completed');
		assert(!beameUtils.getBackgroundJob(name).lastRun.error);
		assert(beameUtils.getBackgroundJob(name).lastRun.timestamp);
		assert(beameUtils.stopBackgroundJob(name));
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('failing runs simple throw', async () => {
		assert(beameUtils.startBackgroundJob(name,async () => { throw 'test_error'}, runningInterval));
		await sleep(runningInterval*2.5);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		assert(beameUtils.getBackgroundJob(name).lastRun.error === 'test_error');
		assert(beameUtils.getBackgroundJob(name).failed === 2);
		assert(beameUtils.stopBackgroundJob(name));
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('failing runs error throw', async () => {
		assert(beameUtils.startBackgroundJob(name,async () => { throw new Error('test_error')}, runningInterval));
		await sleep(runningInterval*2.5);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		assert(beameUtils.getBackgroundJob(name).lastRun.error.message === 'test_error');
		assert(beameUtils.getBackgroundJob(name).lastRun.error.stack);
		assert(beameUtils.getBackgroundJob(name).failed === 2);
		assert(beameUtils.stopBackgroundJob(name));
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('conditional fail run', async () => {
		assert(beameUtils.startBackgroundJob(name,async () => {
			if(beameUtils.getBackgroundJob(name).called === 1) {return 'test_completed'}
			else { throw new Error('test_error')}}, runningInterval));
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
		assert(beameUtils.stopBackgroundJob(name));
		assert(beameUtils.getBackgroundJob(name) === undefined);
	});

	it('can run multiple jobs simultaneously', () => {
		assert(beameUtils.startBackgroundJob(name,() => {}, 2000));
		assert(beameUtils.startBackgroundJob(name2,() => {}, 2000));
		assert(beameUtils.getBackgroundJob(name) !== undefined);
		assert(beameUtils.getBackgroundJob(name2) !== undefined);
		assert(beameUtils.stopBackgroundJob(name));
		assert(beameUtils.stopBackgroundJob(name2));
		assert(beameUtils.getBackgroundJob(name) === undefined);
		assert(beameUtils.getBackgroundJob(name2) === undefined);
	});

	it('can run multiple jobs simultaneously multiple times', async () => {
		assert(beameUtils.startBackgroundJob(name,() => {}, runningInterval));
		assert(beameUtils.startBackgroundJob(name2,() => {}, runningInterval));
		assert(beameUtils.getBackgroundJob(name).called === 0);
		assert(beameUtils.getBackgroundJob(name2).called === 0);
		await sleep(runningInterval*1.5);
		assert(beameUtils.getBackgroundJob(name).called === 1);
		assert(beameUtils.getBackgroundJob(name2).called === 1);
		await sleep(runningInterval);
		assert(beameUtils.getBackgroundJob(name).called === 2);
		assert(beameUtils.getBackgroundJob(name2).called === 2);
		assert(beameUtils.stopBackgroundJob(name));
		await sleep(runningInterval);
		assert(beameUtils.getBackgroundJob(name2).called === 3);
		assert(beameUtils.getBackgroundJob(name) === undefined);
		assert(beameUtils.stopBackgroundJob(name2));
		assert(beameUtils.getBackgroundJob(name2) === undefined);
	});

	it('add already existing job return false', () => {
		assert(beameUtils.startBackgroundJob(name,() => {}, 2000));
		assert(!beameUtils.startBackgroundJob(name,() => {}, 2000));
		assert(beameUtils.stopBackgroundJob(name));
	});

	it('stop non existing job return false', () => {
		assert(!beameUtils.stopBackgroundJob('nonexistingjob'));
	});

	it('double stopping returns false on second', () => {
		assert(beameUtils.startBackgroundJob(name,() => {}, 2000));
		assert(beameUtils.stopBackgroundJob(name));
		assert(!beameUtils.stopBackgroundJob(name));
	});

	it('info non existing job returns undefined', () => {
		assert(beameUtils.getBackgroundJob('nonexistingjob') === undefined);
	});
});
