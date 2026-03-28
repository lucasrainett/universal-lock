# universal-lock

Lightweight, isomorphic universal locking library with pluggable backends. Works in Node.js and browsers.

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

### ESM

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

### CommonJS

```javascript
const { lockFactory } = require("universal-lock");
const { createBackend } = require("@universal-lock/memory");

const lock = lockFactory(createBackend());
```

### Browser (IIFE)

```html
<script src="https://unpkg.com/@universal-lock/memory/dist/index.global.js"></script>
<script src="https://unpkg.com/universal-lock/dist/index.global.js"></script>
<script>
	const lock = UniversalLock.lockFactory(UniversalLockMemory.createBackend());
</script>
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
	maxHoldTime: 2000, // auto-release after this duration in ms (default: 2000)
	onLockLost: (name, reason) => {}, // called when lock is lost (optional)
	onEvent: (event) => {}, // lifecycle events (optional)
});
```

### `lock.acquire(lockName)`

Acquires a named lock. Returns a `release` function with a `.signal: AbortSignal` property. Rejects if the lock cannot be acquired within `acquireFailTimeout`.

### `lockDecoratorFactory(lock)`

Creates a decorator that wraps async functions with automatic lock acquire/release.

The first argument is either a lock name string or an options object. When a string is passed, the wrapped function keeps its original signature. Pass `{ lockName, signal: true }` to inject an `AbortSignal` as the first argument so the function can react to lock loss.

```typescript
import { lockFactory, lockDecoratorFactory } from "universal-lock";
import { createBackend } from "@universal-lock/memory";

const lock = lockFactory(createBackend());
const withLock = lockDecoratorFactory(lock);

// Simple usage — no signal injection
const processOrder = withLock("orders", async (orderId: string) => {
	return await handleOrder(orderId);
});

await processOrder("order-123");

// With signal injection for lock loss detection
const processOrderSafe = withLock({ lockName: "orders", signal: true }, async (signal: AbortSignal, orderId: string) => {
	if (signal.aborted) return;
	return await handleOrder(orderId);
});

await processOrderSafe("order-123");
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

## Examples

See the [`examples/`](https://github.com/lucasrainett/universal-lock/tree/master/examples) folder for ready-to-run TypeScript examples covering basic usage, decorators, lock loss detection, concurrency, Redis, and custom backends.

## License

[MIT](https://github.com/lucasrainett/universal-lock/blob/master/LICENSE)
