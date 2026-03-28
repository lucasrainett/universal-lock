/**
 * Decorator pattern — wrap async functions with automatic lock management.
 *
 * Prerequisites:
 *   pnpm install && pnpm build
 *
 * Run:
 *   npx tsx examples/decorator/main.ts
 */
import { processOrder, processOrderSafe } from "./process-order";

async function main() {
	const result1 = await processOrder("order-1");
	console.log("Result:", result1);

	const result2 = await processOrderSafe("order-2");
	console.log("Result:", result2);
}

main();
