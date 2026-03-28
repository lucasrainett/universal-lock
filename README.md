# universal-lock

Lightweight, isomorphic universal locking library with pluggable backends. Works in Node.js and browsers.

## Features

- Pluggable backend architecture (bring your own storage)
- Automatic lock renewal and stale lock detection
- Lock ownership verification
- Lock loss detection via `AbortSignal` and `onLockLost` callback
- Lifecycle events for observability
- Configurable acquire timeout, retry interval, and max hold time
- Decorator pattern for wrapping async functions
- ESM, CommonJS, and browser (IIFE) builds
- Full TypeScript support

## Packages

| Package                                                   | Description                                        |
| --------------------------------------------------------- | -------------------------------------------------- |
| [`universal-lock`](packages/core)                         | Core library — lock factory and decorator          |
| [`@universal-lock/types`](packages/types)                 | Shared type definitions                            |
| [`@universal-lock/memory`](packages/memory)               | In-memory backend (single-process)                 |
| [`@universal-lock/web-locks`](packages/web-locks)         | Web Locks API backend (cross-tab, modern browsers) |
| [`@universal-lock/local-storage`](packages/local-storage) | LocalStorage backend (cross-tab, older browsers)   |
| [`@universal-lock/redis`](packages/redis)                 | Redis backend (distributed, cross-process/server)  |

## Quick Start

### ESM

```bash
npm install universal-lock @universal-lock/memory
```

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

See the [core package documentation](packages/core) for full API details, configuration options, lock loss detection, decorator pattern, and custom backend implementation.

## Examples

Ready-to-run examples are in the [`examples/`](examples) folder. Each example is its own directory with separate files for lock setup, business logic, and entry point — showing how to structure locks as singletons in a real application.

| Example                                                | Description                                         |
| ------------------------------------------------------ | --------------------------------------------------- |
| [`basic/`](examples/basic)                             | Acquire and release a lock                          |
| [`decorator/`](examples/decorator)                     | Wrap async functions with automatic lock management |
| [`lock-loss-detection/`](examples/lock-loss-detection) | AbortSignal, onLockLost, and lifecycle events       |
| [`concurrency/`](examples/concurrency)                 | Multiple workers competing for the same resource    |
| [`redis/`](examples/redis)                             | Distributed locking with Redis                      |
| [`custom-backend/`](examples/custom-backend)           | Implement your own storage adapter                  |

Run any example with:

```bash
npx tsx examples/basic/main.ts
```

## License

[MIT](LICENSE)
