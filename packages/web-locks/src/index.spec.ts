import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBackend } from "./index";

type LockGrantedCallback = (lock: { name: string } | null) => Promise<void>;

const createMockNavigatorLocks = () => {
	const held = new Map<
		string,
		{ value: Promise<void>; release: () => void }
	>();

	return {
		request: vi.fn(
			(
				name: string,
				options: { ifAvailable: boolean },
				callback: LockGrantedCallback,
			) => {
				if (options.ifAvailable && held.has(name)) {
					return callback(null);
				}

				let release: () => void;
				const holdPromise = new Promise<void>((resolve) => {
					release = resolve;
				});
				held.set(name, { value: holdPromise, release: release! });

				const result = callback({ name });
				return result.then(() => {
					held.delete(name);
				});
			},
		),
		_held: held,
	};
};

describe("webLocksBackend", () => {
	let mockLocks: ReturnType<typeof createMockNavigatorLocks>;

	beforeEach(() => {
		mockLocks = createMockNavigatorLocks();
		vi.stubGlobal("navigator", { locks: mockLocks });
	});

	describe("setup", () => {
		it("should resolve when Web Locks API is available", async () => {
			const backend = createBackend();
			await expect(backend.setup()).resolves.toBeUndefined();
		});

		it("should throw when Web Locks API is not available", async () => {
			vi.stubGlobal("navigator", {});
			const backend = createBackend();
			await expect(backend.setup()).rejects.toThrow(
				"Web Locks API is not available",
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
		it("should succeed for an existing lock with correct owner", async () => {
			const backend = createBackend();
			await backend.acquire("lock-1", 1000, "owner-a");
			await expect(
				backend.renew("lock-1", "owner-a"),
			).resolves.toBeUndefined();
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
});
