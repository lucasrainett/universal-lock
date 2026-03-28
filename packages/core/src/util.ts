import type { AsyncFunction } from "@universal-lock/types";

// Generates a 32-character hex string (4 segments x 8 hex chars) used as a unique lock ownership ID
export const generateId = () =>
	Array.from({ length: 4 }, () =>
		Math.floor(Math.random() * 0x100000000)
			.toString(16)
			.padStart(8, "0"),
	).join("");

export const sleep = async (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Like setInterval but awaits each async handler before scheduling the next.
 * Returns a stop function that sets the running flag to false and waits for the
 * current iteration to finish, ensuring no handler runs after stop() resolves.
 * The double check on `running` (before and after sleep) allows the loop to
 * exit promptly when stopped mid-sleep.
 */
export const asyncInterval = <H extends AsyncFunction<void, []>>(
	handler: H,
	timeout: number,
) => {
	let running = true;
	const loop = (async () => {
		while (running) {
			await handler();
			if (!running) break;
			await sleep(timeout);
		}
	})();
	return async () => {
		running = false;
		await loop;
	};
};
