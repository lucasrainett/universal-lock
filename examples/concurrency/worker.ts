import { lock } from "./lock";

export async function worker(id: number) {
	console.log(`Worker ${id}: waiting to acquire lock...`);
	const release = await lock.acquire("shared-resource");
	console.log(`Worker ${id}: lock acquired`);
	try {
		await new Promise((resolve) => setTimeout(resolve, 200));
		console.log(`Worker ${id}: work done`);
	} finally {
		await release();
		console.log(`Worker ${id}: lock released`);
	}
}
