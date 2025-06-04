import { AsyncFunction, Lock, Backend, LockConfiguration } from "./types";
import { asyncInterval } from "./util";

const defaultConfiguration: LockConfiguration = {
	acquireInterval: 250,
	acquireFailTimeout: 5000,
	stale: 1000,
	renewInterval: 250,
	runningTimeout: 2000,
};

export function lockFactory(
	{setup, acquire, renew, release}: Backend,
	configuration: Partial<LockConfiguration> = {},
): Lock {
	const {
		acquireInterval,
		acquireFailTimeout,
		stale,
		renewInterval,
		runningTimeout,
	} = { ...defaultConfiguration, ...configuration };
	const setupPromise = setup();
	return {
		async acquire(lockName: string) {
			await setupPromise;
			return new Promise((resolve) => {
				const stopAcquireInterval = asyncInterval(async () => {
					try{
						await acquire(lockName, stale);
						const stopRenewInterval = asyncInterval(async () => {
							await renew(lockName);
						}, renewInterval);
						const releaseLock = async () => {
							await stopRenewInterval();
							await release(lockName);
						};
						stopAcquireInterval().then(() => {
							resolve(releaseLock);
						});
					}catch (e){}
				}, acquireInterval);
			});
		}
	}
}

export function lockDecoratoryFactory(lock: Lock){
	return <F extends AsyncFunction>(lockName: string, fn: F) => {
		return async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
			const release = await lock.acquire(lockName);
			try{
				return await fn(...args);
			}finally {
				await release();
			}
		};
	}
}
