import type {
	Backend,
	BackendAcquireFunction,
	BackendFactory,
	BackendReleaseFunction,
	BackendRenewFunction,
	BackendSetupFunction,
	TimestampLockEntry,
} from "@universal-lock/types";

export const createBackend: BackendFactory = (): Backend => {
	const locks: Record<string, TimestampLockEntry> = {};

	const setup: BackendSetupFunction = async () => {};

	const acquire: BackendAcquireFunction = async (lockName, stale, lockId) => {
		const now = Date.now();
		const existing = locks[lockName];
		const lockExpired = existing && existing.timestamp + stale <= now;
		if (!existing || lockExpired) {
			locks[lockName] = { lockId, timestamp: now };
		} else {
			throw new Error(`${lockName} already locked`);
		}
	};

	const renew: BackendRenewFunction = async (lockName, lockId) => {
		const existing = locks[lockName];
		if (!existing) throw new Error(`${lockName} not locked`);
		if (existing.lockId !== lockId)
			throw new Error(`${lockName} not owned by caller`);
		existing.timestamp = Date.now();
	};

	const release: BackendReleaseFunction = async (lockName, lockId) => {
		const existing = locks[lockName];
		if (!existing) throw new Error(`${lockName} not locked`);
		if (existing.lockId !== lockId)
			throw new Error(`${lockName} not owned by caller`);
		delete locks[lockName];
	};

	return {
		setup,
		acquire,
		renew,
		release,
	};
};
