import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBackend } from "./index";

const createMockLocalStorage = () => {
	const store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		_store: store,
	};
};

describe("localStorageBackend", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", createMockLocalStorage());
	});

	describe("setup", () => {
		it("should resolve when localStorage is available", async () => {
			const backend = createBackend();
			await expect(backend.setup()).resolves.toBeUndefined();
		});

		it("should throw when localStorage is not available", async () => {
			vi.stubGlobal("localStorage", undefined);
			const backend = createBackend();
			await expect(backend.setup()).rejects.toThrow(
				"localStorage is not available",
			);
		});
	});

	describe("acquire", () => {
		it("should acquire a lock successfully", async () => {
			const backend = createBackend();
			await expect(
				backend.acquire("lock-1", 1000, "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should write to localStorage with default prefix", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			expect(localStorage.setItem).toHaveBeenCalledWith(
				"universal-lock:lock-1",
				expect.any(String),
			);
		});

		it("should write to localStorage with custom prefix", async () => {
			const backend = createBackend("my-app:");
			await backend.acquire("lock-1", 1000, "owner-a");
			expect(localStorage.setItem).toHaveBeenCalledWith(
				"my-app:lock-1",
				expect.any(String),
			);
		});

		it("should throw when acquiring an already held lock", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.acquire("lock-1", 1000, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should allow acquiring different locks independently", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.acquire("lock-2", 1000, "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should allow acquiring a stale lock", async () => {
			const backend = createBackend();
			const stale = 50;
			await backend.acquire("lock-1", stale, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, stale + 10));
			await expect(
				backend.acquire("lock-1", stale, "owner-b"),
			).resolves.toBeUndefined();
		});

		it("should not allow acquiring a lock that has not yet gone stale", async () => {
			const backend = createBackend();
			const stale = 100;
			await backend.acquire("lock-1", stale, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 10));
			await expect(
				backend.acquire("lock-1", stale, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should detect concurrent write via CAS verification", async () => {
			const mock = createMockLocalStorage();
			const originalSetItem = mock.setItem;
			mock.setItem = vi.fn((key: string, value: string) => {
				originalSetItem(key, value);
				// Simulate another tab overwriting between write and re-read
				mock._store[key] = JSON.stringify({
					lockId: "other-tab",
					timestamp: Date.now(),
				});
			});
			vi.stubGlobal("localStorage", mock);

			const backend = createBackend();
			await expect(
				backend.acquire("lock-1", 1000, "owner-a"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should allow re-acquiring after release", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await backend.release("lock-1", "owner-a");
			await expect(
				backend.acquire("lock-1", 1000, "owner-b"),
			).resolves.toBeUndefined();
		});
	});

	describe("renew", () => {
		it("should renew an existing lock", async () => {
			const backend = createBackend();
			const stale = 50;
			await backend.acquire("lock-1", stale, "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 30));
			await backend.renew("lock-1", "owner-a");
			await new Promise((resolve) => setTimeout(resolve, 30));
			await expect(
				backend.acquire("lock-1", stale, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should throw when renewing a non-existent lock", async () => {
			const backend = createBackend();
			await expect(backend.renew("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not locked",
			);
		});

		it("should throw when renewing with wrong owner", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(backend.renew("lock-1", "owner-b")).rejects.toThrow(
				"lock-1 not owned by caller",
			);
		});
	});

	describe("release", () => {
		it("should release an existing lock", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.release("lock-1", "owner-a"),
			).resolves.toBeUndefined();
		});

		it("should remove from localStorage", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await backend.release("lock-1", "owner-a");
			expect(localStorage.removeItem).toHaveBeenCalledWith(
				"universal-lock:lock-1",
			);
		});

		it("should throw when releasing a non-existent lock", async () => {
			const backend = createBackend();
			await expect(backend.release("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not locked",
			);
		});

		it("should throw when releasing with wrong owner", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(backend.release("lock-1", "owner-b")).rejects.toThrow(
				"lock-1 not owned by caller",
			);
		});

		it("should throw when releasing an already released lock", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await backend.release("lock-1", "owner-a");
			await expect(backend.release("lock-1", "owner-a")).rejects.toThrow(
				"lock-1 not locked",
			);
		});
	});

	describe("isolation", () => {
		it("should share state across factory calls via localStorage", async () => {
			const backend1 = createBackend();
			const backend2 = createBackend();
			await backend1.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend2.acquire("lock-1", 1000, "owner-b"),
			).rejects.toThrow("lock-1 already locked");
		});

		it("should isolate locks with different prefixes", async () => {
			const backend1 = createBackend("app-a:");
			const backend2 = createBackend("app-b:");
			await backend1.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend2.acquire("lock-1", 1000, "owner-b"),
			).resolves.toBeUndefined();
		});
	});
});
