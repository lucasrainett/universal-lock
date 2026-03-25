# universal-lock

Lightweight, isomorphic distributed locking library with pluggable backends. Works in Node.js and browsers.

## Features

- Pluggable backend architecture (bring your own storage)
- Automatic lock renewal and stale lock detection
- Lock ownership verification
- Lock loss detection via `AbortSignal` and `onLockLost` callback
- Lifecycle events for observability
- Configurable acquire timeout, retry interval, and running timeout
- Decorator pattern for wrapping async functions
- ESM, CommonJS, and browser (IIFE) builds
- Full TypeScript support

## Packages

| Package                                                   | Description                                        |
| --------------------------------------------------------- | -------------------------------------------------- |
| [`universal-lock`](packages/core)                         | Core library — lock factory, decorator, and types  |
| [`@universal-lock/types`](packages/types)                 | Shared type definitions                            |
| [`@universal-lock/memory`](packages/memory)               | In-memory backend (single-process)                 |
| [`@universal-lock/web-locks`](packages/web-locks)         | Web Locks API backend (cross-tab, modern browsers) |
| [`@universal-lock/local-storage`](packages/local-storage) | LocalStorage backend (cross-tab, older browsers)   |
| [`@universal-lock/redis`](packages/redis)                 | Redis backend (distributed, cross-process/server)  |

## Installation

```bash
npm install universal-lock @universal-lock/memory
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

## Lock Loss Detection

When a lock is lost (renewal failure or running timeout), the library notifies you via:

### AbortSignal

Every `release` function has a `.signal` property that is aborted when the lock is lost:

```typescript
const release = await lock.acquire("my-resource");

release.signal.addEventListener("abort", () => {
	console.log("Lock lost! Stop critical work.");
});

// ... do work, check release.signal.aborted periodically ...

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

## Decorator Pattern

Wrap async functions with automatic lock management. An `AbortSignal` is passed as the first argument:

```typescript
import { lockFactory, lockDecoratorFactory } from "universal-lock";
import { createBackend } from "@universal-lock/memory";

const lock = lockFactory(createBackend());
const withLock = lockDecoratorFactory(lock);

const processOrder = withLock("orders", async (signal: AbortSignal, orderId: string) => {
	// signal.aborted becomes true if the lock is lost
	if (signal.aborted) return;
	return await handleOrder(orderId);
});

await processOrder("order-123");
```

## Distributed Locking (Redis)

For cross-process/cross-server locking, use the Redis backend. It uses atomic Lua scripts for safe acquire, renew, and release operations.

```typescript
import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/redis";

// With ioredis
import Redis from "ioredis";
const client = new Redis();
const redisClient = {
	eval: (script: string, keys: string[], args: string[]) => client.eval(script, keys.length, ...keys, ...args),
};

// With node-redis
// import { createClient } from "redis";
// const client = createClient();
// await client.connect();
// const redisClient = {
//   eval: (script: string, keys: string[], args: string[]) =>
//     client.eval(script, { keys, arguments: args }),
// };

const lock = lockFactory(createBackend(redisClient));

const release = await lock.acquire("my-resource");
try {
	// critical section — safe across processes and servers
} finally {
	await release();
}
```

## Browser Usage

### Web Locks API (recommended)

Cross-tab locking using the native browser API. Locks are automatically released if a tab crashes.

```typescript
import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/web-locks";

const lock = lockFactory(createBackend());
```

### LocalStorage

Cross-tab locking for older browsers that don't support the Web Locks API.

```typescript
import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/local-storage";

const lock = lockFactory(createBackend()); // default prefix "universal-lock:"
const lock = lockFactory(createBackend("my-app:")); // custom prefix
```

### Script Tag

```html
<script src="https://unpkg.com/universal-lock/dist/index.global.js"></script>
<script>
	const lock = UniversalLock.lockFactory(backend);
</script>
```

## Configuration

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

## Custom Backends

Implement the `Backend` interface to use any storage:

```typescript
import type { Backend } from "@universal-lock/types";

const myBackend: Backend = {
	setup: async () => {
		// initialize connection
	},
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

The `lockId` parameter is a unique ID generated per acquisition. Backends must verify it on `renew` and `release` to prevent a client from operating on another client's lock.

## API

### `lockFactory(backend, config?)`

Creates a lock instance with the given backend and optional configuration. Returns a `Lock` object.

### `lock.acquire(lockName)`

Acquires a named lock. Returns a `release` function with a `.signal: AbortSignal` property. Rejects if the lock cannot be acquired within `acquireFailTimeout`.

### `lockDecoratorFactory(lock)`

Creates a decorator that wraps async functions with automatic lock acquire/release. The wrapped function receives an `AbortSignal` as its first argument.

### `createBackend()` (from each backend package)

Creates a backend instance. Each backend package exports a `createBackend` function.

## Known Limitations

- **No FIFO fairness.** Acquire uses polling with a fixed interval. Multiple waiters have no guaranteed ordering. Fairness requires a queue-based backend (e.g., Redis lists).
- **localStorage atomicity.** The localStorage backend uses a compare-and-swap pattern to reduce race conditions but cannot guarantee perfect atomicity due to localStorage API limitations. Use the Web Locks API backend for stronger cross-tab guarantees.
- **Single-instance Redis.** The Redis backend works with a single Redis instance. For multi-instance quorum locking (Redlock algorithm), a dedicated implementation is needed.

## License

[MIT](LICENSE)
