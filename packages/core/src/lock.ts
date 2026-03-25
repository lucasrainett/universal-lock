import type {
	AsyncFunction,
	Lock,
	Backend,
	LockConfiguration,
	LockReleaseFunction,
} from "@universal-lock/types";
import { asyncInterval, generateId } from "./util";

const defaultConfiguration: LockConfiguration = {
	acquireInterval: 250,
	acquireFailTimeout: 5000,
	stale: 1000,
	renewInterval: 250,
	runningTimeout: 2000,
};

export function lockFactory(
	{ setup, acquire, renew, release }: Backend,
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
			return new Promise<LockReleaseFunction>((resolve, reject) => {
				const lockId = generateId();
				const acquireTimeout = setTimeout(async () => {
					await stopAcquireInterval();
					reject(
						new Error(
							`Failed to acquire lock "${lockName}" within ${acquireFailTimeout}ms`,
						),
					);
				}, acquireFailTimeout);

				const stopAcquireInterval = asyncInterval(async () => {
					try {
						await acquire(lockName, stale, lockId);
					} catch {
						return;
					}

					clearTimeout(acquireTimeout);
					stopAcquireInterval();

					const stopRenewInterval = asyncInterval(async () => {
						await renew(lockName, lockId);
					}, renewInterval);

					let runningTimer: ReturnType<typeof setTimeout> | null =
						null;
					let released = false;

					const releaseLock = async () => {
						if (released) return;
						released = true;
						if (runningTimer) clearTimeout(runningTimer);
						await stopRenewInterval();
						await release(lockName, lockId);
					};

					runningTimer = setTimeout(async () => {
						await releaseLock();
					}, runningTimeout);

					resolve(releaseLock);
				}, acquireInterval);
			});
		},
	};
}

export function lockDecoratorFactory(lock: Lock) {
	return <F extends AsyncFunction>(lockName: string, fn: F) => {
		return async (
			...args: Parameters<F>
		): Promise<Awaited<ReturnType<F>>> => {
			const release = await lock.acquire(lockName);
			let released = false;
			const safeRelease = async () => {
				if (released) return;
				released = true;
				await release();
			};
			try {
				return (await fn(...args)) as Awaited<ReturnType<F>>;
			} finally {
				await safeRelease();
			}
		};
	};
}
