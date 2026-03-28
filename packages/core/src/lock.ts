import type {
	Lock,
	Backend,
	LockConfiguration,
	LockReleaseFunction,
} from "@universal-lock/types";
import { asyncInterval, generateId } from "./util";

const noop = () => {};

const defaultConfiguration: LockConfiguration = {
	acquireInterval: 250,
	acquireFailTimeout: 5000,
	stale: 1000,
	renewInterval: 250,
	maxHoldTime: 2000,
	onLockLost: noop,
	onEvent: noop,
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
		maxHoldTime,
		onLockLost,
		onEvent,
	}: LockConfiguration = { ...defaultConfiguration, ...configuration };
	// Eagerly invoke backend setup so it runs once, not per-acquire
	const setupPromise = setup();

	return {
		async acquire(lockName: string) {
			await setupPromise;
			return new Promise<LockReleaseFunction>((resolve, reject) => {
				const lockId = generateId();
				// AbortController lets consumers detect lock loss via release.signal
				const abortController = new AbortController();

				// Reject the acquire promise if the lock isn't obtained within the timeout
				const acquireTimeout = setTimeout(async () => {
					await stopAcquireInterval();
					onEvent({ type: "acquireTimeout", lockName });
					reject(
						new Error(
							`Failed to acquire lock "${lockName}" within ${acquireFailTimeout}ms`,
						),
					);
				}, acquireFailTimeout);

				// Retry acquisition at a fixed interval until success or timeout
				const stopAcquireInterval = asyncInterval(async () => {
					try {
						await acquire(lockName, stale, lockId);
					} catch {
						// Acquire failed (lock held by another owner) — silently retry on next interval
						return;
					}

					// Lock acquired — stop retrying and cancel the timeout
					clearTimeout(acquireTimeout);
					stopAcquireInterval();

					let maxHoldTimer: ReturnType<typeof setTimeout> | null =
						null;
					// Guards against double-release from concurrent timeout and manual release
					let released = false;

					// Low-level release: idempotent, clears the running timer, notifies the backend
					const doRelease = async () => {
						if (released) return;
						released = true;
						if (maxHoldTimer) clearTimeout(maxHoldTimer);
						await release(lockName, lockId);
						onEvent({ type: "released", lockName });
					};

					// High-level release: stops renewals first, then releases the lock
					const releaseLock = async () => {
						if (released) return;
						await stopRenewInterval();
						await doRelease();
					};

					// Periodically renew the lock to prevent it from going stale
					const stopRenewInterval = asyncInterval(async () => {
						try {
							await renew(lockName, lockId);
							onEvent({ type: "renewed", lockName });
						} catch (error) {
							onEvent({
								type: "renewFailed",
								lockName,
								error,
							});
							onEvent({
								type: "lockLost",
								lockName,
								reason: "renewFailed",
							});
							onLockLost(lockName, "renewFailed");
							// Signal consumers that the lock is no longer held
							abortController.abort();
							// Don't await stopRenewInterval here — we're inside it
							stopRenewInterval();
							await doRelease();
						}
					}, renewInterval);

					// Safety net: auto-release if the caller holds the lock too long
					maxHoldTimer = setTimeout(async () => {
						onEvent({
							type: "lockLost",
							lockName,
							reason: "timeout",
						});
						onLockLost(lockName, "timeout");
						abortController.abort();
						await releaseLock();
					}, maxHoldTime);

					onEvent({ type: "acquired", lockName });

					// Attach the abort signal to the release function so callers can
					// detect lock loss (e.g. via release.signal.aborted or addEventListener)
					const releaseFn = Object.assign(releaseLock, {
						signal: abortController.signal,
					}) as LockReleaseFunction;
					resolve(releaseFn);
				}, acquireInterval);
			});
		},
	};
}

/**
 * Creates a decorator that wraps an async function with automatic lock
 * acquisition and release. The lock is always released in the finally
 * block, even if fn throws.
 *
 * First argument is either a lock name string or an options object.
 * Pass `{ lockName, signal: true }` to inject an AbortSignal as the
 * first argument so the function can react to lock loss during execution.
 */
export function lockDecoratorFactory(lock: Lock) {
	// Overload: string lock name — fn keeps its original signature
	function decorator<A extends unknown[], R>(
		lockName: string,
		fn: (...args: A) => Promise<R>,
	): (...args: A) => Promise<R>;

	// Overload: options object with signal — fn receives AbortSignal as first arg
	function decorator<A extends unknown[], R>(
		options: { lockName: string; signal: true },
		fn: (signal: AbortSignal, ...args: A) => Promise<R>,
	): (...args: A) => Promise<R>;

	// Overload: options object without signal — fn keeps its original signature
	function decorator<A extends unknown[], R>(
		options: { lockName: string; signal?: false },
		fn: (...args: A) => Promise<R>,
	): (...args: A) => Promise<R>;

	function decorator<A extends unknown[], R>(
		lockNameOrOptions: string | { lockName: string; signal?: boolean },
		fn:
			| ((...args: A) => Promise<R>)
			| ((signal: AbortSignal, ...args: A) => Promise<R>),
	) {
		const { lockName, signal: injectSignal } =
			typeof lockNameOrOptions === "string"
				? { lockName: lockNameOrOptions, signal: false }
				: lockNameOrOptions;

		return async (...args: A): Promise<R> => {
			const release = await lock.acquire(lockName);
			let released = false;
			const safeRelease = async () => {
				if (released) return;
				released = true;
				await release();
			};
			try {
				// Only inject the AbortSignal when the caller opted in
				if (injectSignal) {
					return await (
						fn as (signal: AbortSignal, ...args: A) => Promise<R>
					)(release.signal, ...args);
				}
				return await (fn as (...args: A) => Promise<R>)(...args);
			} finally {
				await safeRelease();
			}
		};
	}

	return decorator;
}
