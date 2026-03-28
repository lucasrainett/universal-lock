/**
 * Basic lock usage with the in-memory backend.
 *
 * Prerequisites:
 *   pnpm install && pnpm build
 *
 * Run:
 *   npx tsx examples/basic/main.ts
 */
import { lock } from "./lock";

async function main() {
	const release = await lock.acquire("my-resource");
	try {
		console.log("Lock acquired — doing critical work...");
		await new Promise((resolve) => setTimeout(resolve, 500));
		console.log("Done.");
	} finally {
		await release();
		console.log("Lock released.");
	}
}

main();
