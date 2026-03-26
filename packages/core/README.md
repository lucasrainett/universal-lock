# universal-lock

Lightweight, isomorphic distributed locking library with pluggable backends. Works in Node.js and browsers.

Part of the [`universal-lock`](https://github.com/lucasrainett/universal-lock) monorepo.

## Installation

```bash
npm install universal-lock
```

You also need a backend package:

```bash
npm install @universal-lock/memory      # single-process
npm install @universal-lock/redis        # distributed (cross-process/server)
npm install @universal-lock/web-locks    # browser (cross-tab, modern)
npm install @universal-lock/local-storage # browser (cross-tab, older)
```

## Quick Start

```typescript
import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/memory";

const lock = lockFactory(createBackend());

const release = await lock.acquire("my-resource");
try {
	// critical section
} finally {
	await release();
}
```

## API

### `lockFactory(backend, config?)`

Creates a lock instance with the given backend and optional configuration. Returns a `Lock` object.

```typescript
const lock = lockFactory(backend, {
	acquireInterval: 250, // retry interval in ms (default: 250)
	acquireFailTimeout: 5000, // max wait before failing acquisition (default: 5000)
	stale: 1000, // ignore locks older than this in ms (default: 1000)
	renewInterval: 250, // lock renewal interval in ms (default: 250)
	runningTimeout: 2000, // auto-release after this duration in ms (default: 2000)
	onLockLost: (name, reason) => {}, // called when lock is lost (optional)
	onEvent: (event) => {}, // lifecycle events (optional)
});
```

### `lock.acquire(lockName)`

Acquires a named lock. Returns a `release` function with a `.signal: AbortSignal` property. Rejects if the lock cannot be acquired within `acquireFailTimeout`.

### `lockDecoratorFactory(lock)`

Creates a decorator that wraps async functions with automatic lock acquire/release. The wrapped function receives an `AbortSignal` as its first argument.

```typescript
import { lockFactory, lockDecoratorFactory } from "universal-lock";
import { createBackend } from "@universal-lock/memory";

const lock = lockFactory(createBackend());
const withLock = lockDecoratorFactory(lock);

const processOrder = withLock("orders", async (signal: AbortSignal, orderId: string) => {
	if (signal.aborted) return;
	return await handleOrder(orderId);
});

await processOrder("order-123");
```

## Lock Loss Detection

### AbortSignal

Every `release` function has a `.signal` property that is aborted when the lock is lost:

```typescript
const release = await lock.acquire("my-resource");

release.signal.addEventListener("abort", () => {
	console.log("Lock lost! Stop critical work.");
});

await release();
```

### onLockLost callback

```typescript
const lock = lockFactory(backend, {
	onLockLost: (lockName, reason) => {
		// reason: "renewFailed" | "timeout"
		console.error(`Lock "${lockName}" lost: ${reason}`);
	},
});
```

### Lifecycle events

```typescript
const lock = lockFactory(backend, {
	onEvent: (event) => {
		// event.type: "acquired" | "renewed" | "renewFailed" | "lockLost" | "released" | "acquireTimeout"
		console.log(event.type, event.lockName);
	},
});
```

## Custom Backends

Implement the `Backend` interface to use any storage:

```typescript
import type { Backend } from "universal-lock";

const myBackend: Backend = {
	setup: async () => {},
	acquire: async (lockName, stale, lockId) => {
		// set lock or throw if already held
	},
	renew: async (lockName, lockId) => {
		// extend lock TTL, verify ownership via lockId
	},
	release: async (lockName, lockId) => {
		// delete lock, verify ownership via lockId
	},
};
```

## License

[MIT](https://github.com/lucasrainett/universal-lock/blob/master/LICENSE)
