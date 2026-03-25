import type {
	AsyncFunction,
	Lock,
	Backend,
	LockConfiguration,
	LockReleaseFunction,
} from "@universal-lock/types";
import { asyncInterval, generateId } from "./util";

const defaultConfiguration: Omit<LockConfiguration, "onLockLost" | "onEvent"> =
	{
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
		onLockLost,
		onEvent,
	} = { ...defaultConfiguration, ...configuration };
	const setupPromise = setup();

	return {
		async acquire(lockName: string) {
			await setupPromise;
			return new Promise<LockReleaseFunction>((resolve, reject) => {
				const lockId = generateId();
				const abortController = new AbortController();

				const acquireTimeout = setTimeout(async () => {
					await stopAcquireInterval();
					onEvent?.({ type: "acquireTimeout", lockName });
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

					let runningTimer: ReturnType<typeof setTimeout> | null =
						null;
					let released = false;

					const doRelease = async () => {
						if (released) return;
						released = true;
						if (runningTimer) clearTimeout(runningTimer);
						await release(lockName, lockId);
						onEvent?.({ type: "released", lockName });
					};

					const releaseLock = async () => {
						if (released) return;
						await stopRenewInterval();
						await doRelease();
					};

					const stopRenewInterval = asyncInterval(async () => {
						try {
							await renew(lockName, lockId);
							onEvent?.({ type: "renewed", lockName });
						} catch (error) {
							onEvent?.({
								type: "renewFailed",
								lockName,
								error,
							});
							onEvent?.({
								type: "lockLost",
								lockName,
								reason: "renewFailed",
							});
							onLockLost?.(lockName, "renewFailed");
							abortController.abort();
							// Don't await stopRenewInterval here — we're inside it
							stopRenewInterval();
							await doRelease();
						}
					}, renewInterval);

					runningTimer = setTimeout(async () => {
						onEvent?.({
							type: "lockLost",
							lockName,
							reason: "timeout",
						});
						onLockLost?.(lockName, "timeout");
						abortController.abort();
						await releaseLock();
					}, runningTimeout);

					onEvent?.({ type: "acquired", lockName });

					const releaseFn = Object.assign(releaseLock, {
						signal: abortController.signal,
					}) as LockReleaseFunction;
					resolve(releaseFn);
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
				return (await fn(release.signal, ...args)) as Awaited<
					ReturnType<F>
				>;
			} finally {
				await safeRelease();
			}
		};
	};
}
