import { asyncInterval, generateId, sleep } from "./util";

describe("util", () => {
	describe("generateId", () => {
		it("should return a 32-character hex string", () => {
			const id = generateId();
			expect(id).toMatch(/^[0-9a-f]{32}$/);
		});

		it("should generate unique values", () => {
			const ids = new Set(Array.from({ length: 100 }, () => generateId()));
			expect(ids.size).toBe(100);
		});
	});

	describe("sleep", () => {
		it("should sleep", async () => {
			const timeout = 10;
			const marginOfError = 2;

			let resolved = false;
			sleep(timeout).then(() => {
				resolved = true;
			});
			expect(resolved).toBe(false);
			await new Promise((resolve) =>
				setTimeout(resolve, timeout - marginOfError),
			);
			expect(resolved).toBe(false);
			await new Promise((resolve) =>
				setTimeout(resolve, 2 * marginOfError),
			);
			expect(resolved).toBe(true);
		});
	});

	describe("asyncInterval", () => {
		it("should run cycles until stopped", async () => {
			let counter = 0;
			const stopInterval = asyncInterval(async () => {
				counter++;
			}, 10);

			await new Promise((resolve) => setTimeout(resolve, 100));
			await stopInterval();

			const counterAtStop = counter;
			expect(counterAtStop).toBeGreaterThan(1);

			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(counter).toBe(counterAtStop);
		});
	});
});
