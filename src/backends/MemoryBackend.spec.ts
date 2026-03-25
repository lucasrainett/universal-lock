import { describe, it, expect } from "vitest";
import { memoryBackendFactory } from "./MemoryBackend";

describe("memoryBackend", () => {
	describe("setup", () => {
		it("should resolve without error", async () => {
			const backend = memoryBackendFactory();
			await expect(backend.setup()).resolves.toBeUndefined();
		});
	});

	describe("acquire", () => {
		it("should acquire a lock successfully", async () => {
			const backend = memoryBackendFactory();
			await expect(
				backend.acquire("lock-1", 1000, "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should throw when acquiring an already held lock", async () => {
			const backend = memoryBackendFactory();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.acquire("lock-1", 1000, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should allow acquiring different locks independently", async () => {
			const backend = memoryBackendFactory();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.acquire("lock-2", 1000, "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should allow acquiring a stale lock", async () => {
			const backend = memoryBackendFactory();
			const stale = 50;
			await backend.acquire("lock-1", stale, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, stale));
			await expect(
				backend.acquire("lock-1", stale, "owner-b"),
			).resolves.toBeUndefined();
		});

		it("should not allow acquiring a lock that has not yet gone stale", async () => {
			const backend = memoryBackendFactory();
			const stale = 100;
			await backend.acquire("lock-1", stale, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 10));
			await expect(
				backend.acquire("lock-1", stale, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should allow re-acquiring after release", async () => {
			const backend = memoryBackendFactory();
			await backend.acquire("lock-1", 1000, "owner-a");
			await backend.release("lock-1", "owner-a");
			await expect(
				backend.acquire("lock-1", 1000, "owner-b"),
			).resolves.toBeUndefined();
		});
	});

	describe("renew", () => {
		it("should renew an existing lock", async () => {
			const backend = memoryBackendFactory();
			const stale = 50;
			await backend.acquire("lock-1", stale, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 30));
			await backend.renew("lock-1", "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 30));
			// Lock should still be held because renew reset the timestamp
			await expect(
				backend.acquire("lock-1", stale, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should throw when renewing a non-existent lock", async () => {
			const backend = memoryBackendFactory();
			await expect(backend.renew("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not locked",
			);
		});

		it("should throw when renewing a released lock", async () => {
			const backend = memoryBackendFactory();
			await backend.acquire("lock-1", 1000, "owner-a");
			await backend.release("lock-1", "owner-a");
			await expect(backend.renew("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not locked",
			);
		});

		it("should throw when renewing with wrong owner", async () => {
			const backend = memoryBackendFactory();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(backend.renew("lock-1", "owner-b")).rejects.toThrow(
				"lock-1 not owned by caller",
			);
		});
	});

	describe("release", () => {
		it("should release an existing lock", async () => {
			const backend = memoryBackendFactory();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.release("lock-1", "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should throw when releasing a non-existent lock", async () => {
			const backend = memoryBackendFactory();
			await expect(backend.release("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not locked",
			);
		});

		it("should throw when releasing an already released lock", async () => {
			const backend = memoryBackendFactory();
			await backend.acquire("lock-1", 1000, "owner-a");
			await backend.release("lock-1", "owner-a");
			await expect(backend.release("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not locked",
			);
		});

		it("should throw when releasing with wrong owner", async () => {
			const backend = memoryBackendFactory();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(backend.release("lock-1", "owner-b")).rejects.toThrow(
				"lock-1 not owned by caller",
			);
		});
	});

	describe("isolation", () => {
		it("should have independent state per factory call", async () => {
			const backend1 = memoryBackendFactory();
			const backend2 = memoryBackendFactory();
			await backend1.acquire("lock-1", 1000, "owner-a");
			// backend2 should have its own locks map
			await expect(
				backend2.acquire("lock-1", 1000, "owner-a"),
			).resolves.toBeUndefined();
		});
	});
});
