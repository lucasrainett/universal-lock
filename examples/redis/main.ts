/**
 * Distributed locking with the Redis backend.
 *
 * Prerequisites:
 *   pnpm install && pnpm build
 *   npm install ioredis
 *
 * Run:
 *   npx tsx examples/redis/main.ts
 */
import { lock, client } from "./lock";

async function main() {
	console.log("Acquiring distributed lock...");
	const release = await lock.acquire("shared-resource");
	try {
		console.log("Lock acquired — safe across processes and servers.");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		console.log("Done.");
	} finally {
		await release();
		console.log("Lock released.");
	}

	await client.quit();
}

main();
