import type { Backend } from "@universal-lock/types";

export const createMapBackend = (): Backend => {
	const locks = new Map<string, { lockId: string; timestamp: number }>();

	return {
		setup: async () => {
			console.log("[backend] setup");
		},

		acquire: async (lockName, stale, lockId) => {
			const existing = locks.get(lockName);
			if (existing) {
				const isStale = Date.now() - existing.timestamp >= stale;
				if (!isStale) {
					throw new Error(`${lockName} already locked`);
				}
			}
			locks.set(lockName, { lockId, timestamp: Date.now() });
			console.log(`[backend] acquired "${lockName}" (owner: ${lockId})`);
		},

		renew: async (lockName, lockId) => {
			const existing = locks.get(lockName);
			if (!existing || existing.lockId !== lockId) {
				throw new Error(`${lockName} not owned`);
			}
			existing.timestamp = Date.now();
			console.log(`[backend] renewed "${lockName}"`);
		},

		release: async (lockName, lockId) => {
			const existing = locks.get(lockName);
			if (existing && existing.lockId === lockId) {
				locks.delete(lockName);
				console.log(`[backend] released "${lockName}"`);
			}
		},
	};
};
