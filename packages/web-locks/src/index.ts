import type {
	Backend,
	BackendAcquireFunction,
	BackendFactory,
	BackendReleaseFunction,
	BackendRenewFunction,
	BackendSetupFunction,
	CallbackLockEntry,
} from "@universal-lock/types";

export const createBackend: BackendFactory = (): Backend => {
	const locks: Record<string, CallbackLockEntry> = {};

	const setup: BackendSetupFunction = async () => {
		if (typeof navigator === "undefined" || !navigator.locks) {
			throw new Error("Web Locks API is not available");
		}
	};

	// The Web Locks API holds a lock for the duration of the callback's returned promise.
	// To control when the lock is released, we return a promise whose resolve function
	// (releaseResolve) is stored and called later in the release() method.
	// ifAvailable: true makes this non-blocking — fails immediately if the lock is held.
	const acquire: BackendAcquireFunction = async (
		lockName,
		_stale,
		lockId,
	) => {
		await new Promise<void>((resolve, reject) => {
			navigator.locks.request(lockName, { ifAvailable: true }, (lock) => {
				if (!lock) {
					reject(new Error(`${lockName} already locked`));
					// Must return a resolved promise to complete the lock request callback
					return Promise.resolve();
				}

				// Return an unresolved promise — the browser holds the lock until this resolves
				return new Promise<void>((releaseResolve) => {
					locks[lockName] = { lockId, release: releaseResolve };
					resolve();
				});
			});
		});
	};

	// Renew is a no-op for Web Locks — the browser holds the lock until the promise resolves,
	// so there is no TTL to refresh. We only validate ownership here.
	const renew: BackendRenewFunction = async (lockName, lockId) => {
		const existing = locks[lockName];
		if (!existing) throw new Error(`${lockName} not locked`);
		if (existing.lockId !== lockId)
			throw new Error(`${lockName} not owned by caller`);
	};

	const release: BackendReleaseFunction = async (lockName, lockId) => {
		const existing = locks[lockName];
		if (!existing) throw new Error(`${lockName} not locked`);
		if (existing.lockId !== lockId)
			throw new Error(`${lockName} not owned by caller`);
		existing.release();
		delete locks[lockName];
	};

	return {
		setup,
		acquire,
		renew,
		release,
	};
};
