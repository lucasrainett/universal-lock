import { AsyncFunction } from "./types";

export const sleep = async (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const asyncInterval = <H extends AsyncFunction<void, []>>(
	handler: H,
	timeout: number,
) => {
	let running = true;
	(async () => {
		while (running) {
			await handler();
			if (!running) break;
			await sleep(timeout);
		}
	})();
	return async () => {
		running = false;
	};
};
