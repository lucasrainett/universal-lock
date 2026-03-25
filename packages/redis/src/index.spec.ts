import { describe, it, expect, vi } from "vitest";
import { createBackend, type RedisClient } from "./index";

const createMockRedisClient = (): RedisClient => {
	const store = new Map<string, { value: string; expiry: number }>();

	return {
		eval: vi.fn(
			async (
				script: string,
				keys: string[],
				args: string[],
			): Promise<unknown> => {
				const key = keys[0];
				const now = Date.now();

				// Clean expired keys
				const entry = store.get(key);
				if (entry && entry.expiry <= now) {
					store.delete(key);
				}

				if (script.includes("'NX'")) {
					// ACQUIRE
					const lockId = args[0];
					const ttl = parseInt(args[1]);
					if (store.has(key)) return 0;
					store.set(key, {
						value: lockId,
						expiry: now + ttl,
					});
					return 1;
				} else if (script.includes("PEXPIRE")) {
					// RENEW
					const lockId = args[0];
					const ttl = parseInt(args[1]);
					const current = store.get(key);
					if (!current || current.value !== lockId) return 0;
					current.expiry = now + ttl;
					return 1;
				} else if (script.includes("DEL")) {
					// RELEASE
					const lockId = args[0];
					const current = store.get(key);
					if (!current || current.value !== lockId) return 0;
					store.delete(key);
					return 1;
				}

				return 0;
			},
		),
	};
};

describe("redisBackend", () => {
	describe("setup", () => {
		it("should resolve without error", async () => {
			const backend = createBackend(createMockRedisClient());
			await expect(backend.setup()).resolves.toBeUndefined();
		});
	});

	describe("acquire", () => {
		it("should acquire a lock successfully", async () => {
			const backend = createBackend(createMockRedisClient());
			await expect(
				backend.acquire("lock-1", 1000, "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should throw when acquiring an already held lock", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.acquire("lock-1", 1000, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should allow acquiring different locks independently", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.acquire("lock-2", 1000, "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should allow acquiring an expired lock", async () => {
			const backend = createBackend(createMockRedisClient());
			const stale = 50;
			await backend.acquire("lock-1", stale, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, stale + 10));
			await expect(
				backend.acquire("lock-1", stale, "owner-b"),
			).resolves.toBeUndefined();
		});

		it("should not allow acquiring a lock that has not expired", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 200, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 10));
			await expect(
				backend.acquire("lock-1", 200, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should allow re-acquiring after release", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 1000, "owner-a");
			await backend.release("lock-1", "owner-a");
			await expect(
				backend.acquire("lock-1", 1000, "owner-b"),
			).resolves.toBeUndefined();
		});

		it("should use custom prefix for Redis keys", async () => {
			const client = createMockRedisClient();
			const backend = createBackend(client, { prefix: "my-app:" });
			await backend.acquire("lock-1", 1000, "owner-a");
			expect(client.eval).toHaveBeenCalledWith(
				expect.any(String),
				["my-app:lock-1"],
				expect.any(Array),
			);
		});
	});

	describe("renew", () => {
		it("should renew an existing lock", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 100, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 50));
			await backend.renew("lock-1", "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 70));
			// Lock should still be held because renew reset the TTL
			await expect(
				backend.acquire("lock-1", 100, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should throw when renewing a non-existent lock", async () => {
			const backend = createBackend(createMockRedisClient());
			await expect(backend.renew("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not locked",
			);
		});

		it("should throw when renewing with wrong owner", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(backend.renew("lock-1", "owner-b")).rejects.toThrow(
				"lock-1 not owned by caller",
			);
		});
	});

	describe("release", () => {
		it("should release an existing lock", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.release("lock-1", "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should throw when releasing with wrong owner", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(backend.release("lock-1", "owner-b")).rejects.toThrow(
				"lock-1 not owned by caller",
			);
		});

		it("should throw when releasing an already released lock", async () => {
			const backend = createBackend(createMockRedisClient());
			await backend.acquire("lock-1", 1000, "owner-a");
			await backend.release("lock-1", "owner-a");
			await expect(backend.release("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not owned by caller",
			);
		});
	});

	describe("concurrency", () => {
		it("should reject one of two concurrent acquires on the same lock", async () => {
			const backend = createBackend(createMockRedisClient());
			const results = await Promise.allSettled([
				backend.acquire("lock-1", 1000, "owner-a"),
				backend.acquire("lock-1", 1000, "owner-b"),
			]);
			const fulfilled = results.filter((r) => r.status === "fulfilled");
			const rejected = results.filter((r) => r.status === "rejected");
			expect(fulfilled).toHaveLength(1);
			expect(rejected).toHaveLength(1);
		});
	});
});
