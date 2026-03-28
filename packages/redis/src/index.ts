import type {
	Backend,
	BackendAcquireFunction,
	BackendReleaseFunction,
	BackendRenewFunction,
	BackendSetupFunction,
} from "@universal-lock/types";

export interface RedisClient {
	eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}

export interface RedisBackendOptions {
	prefix?: string;
}

const DEFAULT_PREFIX = "universal-lock:";

// Atomically set the lock key only if it doesn't exist (NX), with a TTL in ms (PX).
// This ensures only one client can hold the lock at a time.
const ACQUIRE_SCRIPT = `
if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then
  return 1
end
return 0
`;

// Renew only if the caller still owns the lock (value matches lockId).
// Resets the TTL to prevent the lock from expiring while still in use.
const RENEW_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return 1
end
return 0
`;

// Delete only if the caller owns the lock, preventing one client from
// releasing another client's lock after a stale takeover.
const RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('DEL', KEYS[1])
  return 1
end
return 0
`;

export const createBackend = (
	client: RedisClient,
	options: RedisBackendOptions = {},
): Backend => {
	const prefix = options.prefix ?? DEFAULT_PREFIX;
	// Cache the stale TTL per lock so renew can re-apply the same expiration
	const ttls = new Map<string, number>();

	const key = (lockName: string) => prefix + lockName;

	const setup: BackendSetupFunction = async () => {};

	const acquire: BackendAcquireFunction = async (lockName, stale, lockId) => {
		const result = await client.eval(
			ACQUIRE_SCRIPT,
			[key(lockName)],
			[lockId, String(stale)],
		);
		if (result !== 1) {
			throw new Error(`${lockName} already locked`);
		}
		ttls.set(lockName, stale);
	};

	const renew: BackendRenewFunction = async (lockName, lockId) => {
		const ttl = ttls.get(lockName);
		if (!ttl) throw new Error(`${lockName} not locked`);
		const result = await client.eval(
			RENEW_SCRIPT,
			[key(lockName)],
			[lockId, String(ttl)],
		);
		if (result !== 1) {
			throw new Error(`${lockName} not owned by caller`);
		}
	};

	const release: BackendReleaseFunction = async (lockName, lockId) => {
		const result = await client.eval(
			RELEASE_SCRIPT,
			[key(lockName)],
			[lockId],
		);
		ttls.delete(lockName);
		if (result !== 1) {
			throw new Error(`${lockName} not owned by caller`);
		}
	};

	return {
		setup,
		acquire,
		renew,
		release,
	};
};
