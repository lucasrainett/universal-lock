import { asyncInterval, sleep } from "./util";

describe("util", () => {
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
			const timeout = 10;
			const marginOfError = 2;
			const numberOfCycles = 3;

			let counter = 0;
			const stopInterval = asyncInterval(async () => {
				counter++;
			}, timeout);

			await new Promise((resolve) =>
				setTimeout(
					resolve,
					timeout * (numberOfCycles - 1) + marginOfError,
				),
			);
			await stopInterval();
			expect(counter).toBe(numberOfCycles);
		});
	});
});
