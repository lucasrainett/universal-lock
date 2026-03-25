import {
	Backend,
	BackendAcquireFunction,
	BackendFactory,
	BackendReleaseFunction,
	BackendRenewFunction,
	BackendSetupFunction
} from "../types";

type LockEntry = { value: string; timestamp: number };

export const memoryBackendFactory: BackendFactory = (): Backend => {
	const locks: Record<string, LockEntry> = {};

	const setup: BackendSetupFunction = async () => {};

	const acquire: BackendAcquireFunction = async (lockName, stale, value) => {
		const now = Date.now();
		const existing = locks[lockName];
		const lockExpired = existing && existing.timestamp + stale <= now;
		if (!existing || lockExpired) {
			locks[lockName] = { value, timestamp: now };
		} else {
			throw new Error(`${lockName} already locked`);
		}
	};

	const renew: BackendRenewFunction = async (lockName, value) => {
		const existing = locks[lockName];
		if (!existing) throw new Error(`${lockName} not locked`);
		if (existing.value !== value) throw new Error(`${lockName} not owned by caller`);
		existing.timestamp = Date.now();
	};

	const release: BackendReleaseFunction = async (lockName, value) => {
		const existing = locks[lockName];
		if (!existing) throw new Error(`${lockName} not locked`);
		if (existing.value !== value) throw new Error(`${lockName} not owned by caller`);
		delete locks[lockName];
	};

	return {
		setup,
		acquire,
		renew,
		release,
	};
};
