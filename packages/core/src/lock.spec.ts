import { describe, it, expect, vi, type Mock } from "vitest";
import { lockFactory, lockDecoratorFactory } from "./lock";
import type { Backend } from "./types";

const createMockBackend = (overrides: Partial<Backend> = {}): Backend => ({
	setup: vi.fn().mockResolvedValue(undefined),
	acquire: vi.fn().mockResolvedValue(undefined),
	renew: vi.fn().mockResolvedValue(undefined),
	release: vi.fn().mockResolvedValue(undefined),
	...overrides,
});

const shortConfig = {
	acquireInterval: 10,
	acquireFailTimeout: 200,
	stale: 100,
	renewInterval: 10,
	runningTimeout: 200,
};

describe("lockFactory", () => {
	it("should call setup on creation", () => {
		const backend = createMockBackend();
		lockFactory(backend, shortConfig);
		expect(backend.setup).toHaveBeenCalledTimes(1);
	});

	it("should acquire and release a lock", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, shortConfig);

		const release = await lock.acquire("test-lock");
		expect(backend.acquire).toHaveBeenCalledWith(
			"test-lock",
			shortConfig.stale,
			expect.any(String),
		);

		await release();
		expect(backend.release).toHaveBeenCalledWith(
			"test-lock",
			expect.any(String),
		);
	});

	it("should retry acquiring when acquire fails", async () => {
		let attempts = 0;
		const backend = createMockBackend({
			acquire: vi.fn().mockImplementation(async () => {
				attempts++;
				if (attempts < 3) throw new Error("locked");
			}),
		});
		const lock = lockFactory(backend, shortConfig);

		const release = await lock.acquire("test-lock");
		expect(attempts).toBe(3);
		await release();
	});

	it("should reject when acquire timeout is exceeded", async () => {
		const backend = createMockBackend({
			acquire: vi.fn().mockRejectedValue(new Error("locked")),
		});
		const lock = lockFactory(backend, {
			...shortConfig,
			acquireFailTimeout: 50,
		});

		await expect(lock.acquire("test-lock")).rejects.toThrow(
			'Failed to acquire lock "test-lock" within 50ms',
		);
	});

	it("should renew the lock periodically after acquiring", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, shortConfig);

		const release = await lock.acquire("test-lock");
		await new Promise((resolve) => setTimeout(resolve, 35));
		await release();

		expect(backend.renew).toHaveBeenCalled();
		expect(backend.renew).toHaveBeenCalledWith(
			"test-lock",
			expect.any(String),
		);
	});

	it("should stop renewing after release", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, shortConfig);

		const release = await lock.acquire("test-lock");
		await release();

		const renewCountAtRelease = (backend.renew as Mock).mock.calls.length;
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect((backend.renew as Mock).mock.calls.length).toBe(
			renewCountAtRelease,
		);
	});

	it("should auto-release after runningTimeout", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, {
			...shortConfig,
			runningTimeout: 50,
		});

		await lock.acquire("test-lock");
		await new Promise((resolve) => setTimeout(resolve, 80));

		expect(backend.release).toHaveBeenCalledWith(
			"test-lock",
			expect.any(String),
		);
	});

	it("should not auto-release if manually released before timeout", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, {
			...shortConfig,
			runningTimeout: 100,
		});

		const release = await lock.acquire("test-lock");
		await release();

		expect(backend.release).toHaveBeenCalledTimes(1);
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(backend.release).toHaveBeenCalledTimes(1);
	});

	it("should use the same lockId for acquire, renew, and release", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, shortConfig);

		const release = await lock.acquire("test-lock");
		await new Promise((resolve) => setTimeout(resolve, 15));
		await release();

		const acquireLockId = (backend.acquire as Mock).mock.calls[0][2];
		const renewLockId = (backend.renew as Mock).mock.calls[0][1];
		const releaseLockId = (backend.release as Mock).mock.calls[0][1];

		expect(acquireLockId).toBe(renewLockId);
		expect(acquireLockId).toBe(releaseLockId);
	});

	it("should use different lockIds for separate acquisitions", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, shortConfig);

		const release1 = await lock.acquire("lock-1");
		await release1();
		const release2 = await lock.acquire("lock-2");
		await release2();

		const lockId1 = (backend.acquire as Mock).mock.calls[0][2];
		const lockId2 = (backend.acquire as Mock).mock.calls[1][2];

		expect(lockId1).not.toBe(lockId2);
	});

	it("should await setup before acquiring", async () => {
		const order: string[] = [];
		const backend = createMockBackend({
			setup: vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 30));
				order.push("setup");
			}),
			acquire: vi.fn().mockImplementation(async () => {
				order.push("acquire");
			}),
		});
		const lock = lockFactory(backend, shortConfig);

		const release = await lock.acquire("test-lock");
		expect(order).toEqual(["setup", "acquire"]);
		await release();
	});
});

describe("lockDecoratorFactory", () => {
	it("should acquire and release lock around function execution", async () => {
		const order: string[] = [];
		const backend = createMockBackend({
			acquire: vi.fn().mockImplementation(async () => {
				order.push("acquire");
			}),
			release: vi.fn().mockImplementation(async () => {
				order.push("release");
			}),
		});
		const lock = lockFactory(backend, shortConfig);
		const withLock = lockDecoratorFactory(lock);

		const fn = withLock("test-lock", async () => {
			order.push("fn");
			return "result";
		});

		const result = await fn();
		expect(result).toBe("result");
		expect(order).toEqual(["acquire", "fn", "release"]);
	});

	it("should only release once when runningTimeout fires before function completes", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, {
			...shortConfig,
			runningTimeout: 30,
		});
		const withLock = lockDecoratorFactory(lock);

		const fn = withLock("test-lock", async () => {
			await new Promise((resolve) => setTimeout(resolve, 80));
			return "result";
		});

		await fn();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(backend.release).toHaveBeenCalledTimes(1);
	});

	it("should release lock even if function throws", async () => {
		const backend = createMockBackend();
		const lock = lockFactory(backend, shortConfig);
		const withLock = lockDecoratorFactory(lock);

		const fn = withLock("test-lock", async () => {
			throw new Error("boom");
		});

		await expect(fn()).rejects.toThrow("boom");
		expect(backend.release).toHaveBeenCalledWith(
			"test-lock",
			expect.any(String),
		);
	});
});
