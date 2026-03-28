/**
 * Lock loss detection via AbortSignal, onLockLost callback, and lifecycle events.
 *
 * Prerequisites:
 *   pnpm install && pnpm build
 *
 * Run:
 *   npx tsx examples/lock-loss-detection/main.ts
 */
import { lock } from "./lock";

async function main() {
	const release = await lock.acquire("my-resource");

	release.signal.addEventListener("abort", () => {
		console.log("[signal] Lock was lost!");
	});

	// Simulate long-running work that exceeds maxHoldTime
	console.log("Lock acquired. Holding for 800ms (maxHoldTime is 500ms)...");
	await new Promise((resolve) => setTimeout(resolve, 800));

	console.log(`Signal aborted: ${release.signal.aborted}`);
}

main();
