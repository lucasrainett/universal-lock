/**
 * Concurrent lock acquisition — multiple workers competing for the same resource.
 *
 * Prerequisites:
 *   pnpm install && pnpm build
 *
 * Run:
 *   npx tsx examples/concurrency/main.ts
 */
import { worker } from "./worker";

async function main() {
	await Promise.all([worker(1), worker(2), worker(3), worker(4), worker(5)]);
	console.log("All workers finished.");
}

main();
