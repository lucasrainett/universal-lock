import { withLock } from "./lock";

export const processOrder = withLock("orders", async (orderId: string) => {
	console.log(`Processing order ${orderId}...`);
	await new Promise((resolve) => setTimeout(resolve, 300));
	console.log(`Order ${orderId} processed.`);
	return { orderId, status: "completed" };
});

export const processOrderSafe = withLock(
	{ lockName: "orders", signal: true },
	async (signal: AbortSignal, orderId: string) => {
		console.log(
			`Processing order ${orderId} (with lock loss detection)...`,
		);
		for (let i = 0; i < 3; i++) {
			if (signal.aborted) {
				console.log("Lock lost! Aborting.");
				return { orderId, status: "aborted" };
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		console.log(`Order ${orderId} processed.`);
		return { orderId, status: "completed" };
	},
);
