/**
 * Custom backend implementation — shows how to create your own storage adapter.
 *
 * Prerequisites:
 *   pnpm install && pnpm build
 *
 * Run:
 *   npx tsx examples/custom-backend/main.ts
 */
import { lock } from "./lock";

async function main() {
	const release = await lock.acquire("my-resource");
	try {
		console.log("Lock acquired with custom backend.");
		await new Promise((resolve) => setTimeout(resolve, 500));
	} finally {
		await release();
		console.log("Lock released.");
	}
}

main();
