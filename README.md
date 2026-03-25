# universal-lock

Lightweight, isomorphic distributed locking library with pluggable backends. Works in Node.js and browsers with zero runtime dependencies.

## Features

- Pluggable backend architecture (bring your own storage)
- Automatic lock renewal and stale lock detection
- Lock ownership verification
- Configurable acquire timeout, retry interval, and running timeout
- Decorator pattern for wrapping async functions
- ESM, CommonJS, and browser (IIFE) builds
- Zero runtime dependencies
- Full TypeScript support

## Installation

```bash
npm install universal-lock
```

## Quick Start

```typescript
import { lockFactory, memoryBackendFactory } from "universal-lock";

const backend = memoryBackendFactory();
const lock = lockFactory(backend);

const release = await lock.acquire("my-resource");
try {
	// critical section
} finally {
	await release();
}
```

## Decorator Pattern

Wrap async functions with automatic lock management:

```typescript
import { lockFactory, lockDecoratorFactory, memoryBackendFactory } from "universal-lock";

const lock = lockFactory(memoryBackendFactory());
const withLock = lockDecoratorFactory(lock);

const processOrder = withLock("orders", async (orderId: string) => {
	// only one call runs at a time
	return await handleOrder(orderId);
});

await processOrder("order-123");
```

## Browser Usage

```html
<script src="https://unpkg.com/universal-lock/dist/index.global.js"></script>
<script>
	const backend = UniversalLock.memoryBackendFactory();
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
});
```

## Custom Backends

Implement the `Backend` interface to use any storage:

```typescript
import { Backend, lockFactory } from "universal-lock";

const redisBackend: Backend = {
	setup: async () => {
		// initialize connection
	},
	acquire: async (lockName, stale, value) => {
		// set lock or throw if already held
	},
	renew: async (lockName, value) => {
		// extend lock TTL, verify ownership via value
	},
	release: async (lockName, value) => {
		// delete lock, verify ownership via value
	},
};

const lock = lockFactory(redisBackend);
```

The `value` parameter is a unique ID generated per acquisition. Backends must verify it on `renew` and `release` to prevent a client from operating on another client's lock.

## API

### `lockFactory(backend, config?)`

Creates a lock instance with the given backend and optional configuration. Returns a `Lock` object.

### `lock.acquire(lockName)`

Acquires a named lock. Returns a `release` function. Rejects if the lock cannot be acquired within `acquireFailTimeout`.

### `lockDecoratorFactory(lock)`

Creates a decorator that wraps async functions with automatic lock acquire/release.

### `memoryBackendFactory()`

Creates an in-memory backend. Suitable for single-process locking.

## License

[MIT](LICENSE)
