
const assert = require('assert').strict;
const beameUtils = require('../../src/utils/BeameUtils');
const sleep = require('util').promisify(setTimeout);

describe('background jobs', () => {
	const runningInterval = 20;

	it('start/stopping job', () => {
		assert(beameUtils.startBackgroundJob('test123', () => {}, 2000));
		assert(beameUtils.infoBackgroundJob('test123') !== undefined);
		assert(beameUtils.infoBackgroundJob('test123').executed === 0);
		assert(beameUtils.infoBackgroundJob('test123').handle);
		assert(beameUtils.infoBackgroundJob('test123').interval === 2000);
		assert(beameUtils.stopBackgroundJob('test123'));
		assert(beameUtils.infoBackgroundJob('test123') === undefined);
	});

	it('job runs multiple times', async () => {
		assert(beameUtils.startBackgroundJob('test321',() => {}, runningInterval));
		await sleep(runningInterval * 2.5);
		assert(beameUtils.infoBackgroundJob('test321').executed === 2);
		assert(beameUtils.stopBackgroundJob('test321'));
	});

	it('can run multiple jobs simultaneously', () => {
		assert(beameUtils.startBackgroundJob('test1',() => {}, 2000));
		assert(beameUtils.startBackgroundJob('test2',() => {}, 2000));
		assert(beameUtils.infoBackgroundJob('test1') !== undefined);
		assert(beameUtils.infoBackgroundJob('test2') !== undefined);
		assert(beameUtils.stopBackgroundJob('test1'));
		assert(beameUtils.stopBackgroundJob('test2'));
		assert(beameUtils.infoBackgroundJob('test1') === undefined);
		assert(beameUtils.infoBackgroundJob('test2') === undefined);
	});

	it('can run multiple jobs simultaneously multiple times', async () => {
		assert(beameUtils.startBackgroundJob('test3',() => {}, runningInterval));
		assert(beameUtils.startBackgroundJob('test4',() => {}, runningInterval));
		await sleep(runningInterval*1.5);
		assert(beameUtils.infoBackgroundJob('test3').executed === 1);
		assert(beameUtils.infoBackgroundJob('test4').executed === 1);
		await sleep(runningInterval);
		assert(beameUtils.infoBackgroundJob('test3').executed === 2);
		assert(beameUtils.infoBackgroundJob('test4').executed === 2);
		assert(beameUtils.stopBackgroundJob('test3'));
		await sleep(runningInterval);
		assert(beameUtils.infoBackgroundJob('test4').executed === 3);
		assert(beameUtils.infoBackgroundJob('test3') === undefined);
		assert(beameUtils.stopBackgroundJob('test4'));
		assert(beameUtils.infoBackgroundJob('test4') === undefined);
	});

	it('add already existing job return false', () => {
		assert(beameUtils.startBackgroundJob('test6',() => {}, 2000));
		assert(!beameUtils.startBackgroundJob('test6',() => {}, 2000));
		assert(beameUtils.stopBackgroundJob('test6'));
	});

	it('stop non existing job return false', () => {
		assert(!beameUtils.stopBackgroundJob('nonexistingjob'));
	});

	it('double stopping returns false on second', () => {
		assert(beameUtils.startBackgroundJob('test7',() => {}, 2000));
		assert(beameUtils.stopBackgroundJob('test7'));
		assert(!beameUtils.stopBackgroundJob('test7'));
	});

	it('info non existing job returns undefined', () => {
		assert(beameUtils.infoBackgroundJob('nonexistingjob') === undefined);
	});
});
