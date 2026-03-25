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

	const acquire: BackendAcquireFunction = async (
		lockName,
		_stale,
		lockId,
	) => {
		await new Promise<void>((resolve, reject) => {
			navigator.locks.request(lockName, { ifAvailable: true }, (lock) => {
				if (!lock) {
					reject(new Error(`${lockName} already locked`));
					return Promise.resolve();
				}

				return new Promise<void>((releaseResolve) => {
					locks[lockName] = { lockId, release: releaseResolve };
					resolve();
				});
			});
		});
	};

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
