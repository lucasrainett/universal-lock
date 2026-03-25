import { AsyncFunction } from "./types";

export const generateId = () => Array.from({ length: 4 }, () =>
		Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, "0"),
	).join("");

export const sleep = async (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

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
