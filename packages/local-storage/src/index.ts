import type {
	Backend,
	BackendAcquireFunction,
	BackendReleaseFunction,
	BackendRenewFunction,
	BackendSetupFunction,
	TimestampLockEntry,
} from "@universal-lock/types";

const DEFAULT_PREFIX = "universal-lock:";

export const createBackend = (prefix: string = DEFAULT_PREFIX): Backend => {
	const setup: BackendSetupFunction = async () => {
		if (typeof localStorage === "undefined") {
			throw new Error("localStorage is not available");
		}
	};

	const read = (lockName: string): TimestampLockEntry | null => {
		const raw = localStorage.getItem(prefix + lockName);
		if (!raw) return null;
		return JSON.parse(raw) as TimestampLockEntry;
	};

	const write = (lockName: string, entry: TimestampLockEntry): void => {
		localStorage.setItem(prefix + lockName, JSON.stringify(entry));
	};

	const remove = (lockName: string): void => {
		localStorage.removeItem(prefix + lockName);
	};

	/**
	 * Acquires a lock using a compare-and-swap pattern.
	 * Note: localStorage does not support true atomic operations.
	 * The CAS verification significantly reduces the race window but
	 * cannot eliminate it entirely. For stronger cross-tab guarantees,
	 * use the Web Locks API backend instead.
	 */
	const acquire: BackendAcquireFunction = async (lockName, stale, lockId) => {
		const now = Date.now();
		const existing = read(lockName);
		const lockExpired = existing && existing.timestamp + stale <= now;
		if (!existing || lockExpired) {
			write(lockName, { lockId, timestamp: now });
			const verification = read(lockName);
			if (!verification || verification.lockId !== lockId) {
				throw new Error(`${lockName} already locked`);
			}
		} else {
			throw new Error(`${lockName} already locked`);
		}
	};

	const renew: BackendRenewFunction = async (lockName, lockId) => {
		const existing = read(lockName);
		if (!existing) throw new Error(`${lockName} not locked`);
		if (existing.lockId !== lockId)
			throw new Error(`${lockName} not owned by caller`);
		write(lockName, { lockId, timestamp: Date.now() });
	};

	const release: BackendReleaseFunction = async (lockName, lockId) => {
		const existing = read(lockName);
		if (!existing) throw new Error(`${lockName} not locked`);
		if (existing.lockId !== lockId)
			throw new Error(`${lockName} not owned by caller`);
		remove(lockName);
	};

	return {
		setup,
		acquire,
		renew,
		release,
	};
};
