import { describe, it, expect } from "vitest";
import { lockFactory, lockDecoratorFactory } from "./lock";
import { createBackend } from "@universal-lock/memory";

describe("index", () => {
	it("should export lockFactory", () => {
		expect(lockFactory).toBeTypeOf("function");
	});

	it("should export lockDecoratorFactory", () => {
		expect(lockDecoratorFactory).toBeTypeOf("function");
	});
});

describe("integration", () => {
	const shortConfig = {
		acquireInterval: 10,
		acquireFailTimeout: 200,
		stale: 100,
		renewInterval: 10,
		runningTimeout: 200,
	};

	it("should acquire and release with memory backend", async () => {
		const lock = lockFactory(createBackend(), shortConfig);
		const release = await lock.acquire("test-lock");
		expect(release).toBeTypeOf("function");
		expect(release.signal).toBeInstanceOf(AbortSignal);
		await release();
	});

	it("should serialize concurrent acquires on the same lock", async () => {
		const lock = lockFactory(createBackend(), shortConfig);
		const order: string[] = [];

		const task1 = lock.acquire("shared").then(async (release) => {
			order.push("task1-in");
			await new Promise((r) => setTimeout(r, 30));
			order.push("task1-out");
			await release();
		});

		const task2 = lock.acquire("shared").then(async (release) => {
			order.push("task2-in");
			await new Promise((r) => setTimeout(r, 10));
			order.push("task2-out");
			await release();
		});

		await Promise.all([task1, task2]);
		expect(order).toEqual([
			"task1-in",
			"task1-out",
			"task2-in",
			"task2-out",
		]);
	});

	it("should work end-to-end with lockDecoratorFactory", async () => {
		const lock = lockFactory(createBackend(), shortConfig);
		const withLock = lockDecoratorFactory(lock);

		const fn = withLock(
			"test-lock",
			async (signal: AbortSignal, x: number) => {
				expect(signal).toBeInstanceOf(AbortSignal);
				return x * 2;
			},
		);

		const result = await fn(21);
		expect(result).toBe(42);
	});
});
