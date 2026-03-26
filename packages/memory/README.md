# @universal-lock/memory

In-memory backend for [`universal-lock`](https://github.com/lucasrainett/universal-lock). Stores locks in a plain JavaScript object using timestamps for stale detection.

## Installation

```bash
npm install universal-lock @universal-lock/memory
```

## Usage

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

### `createBackend()`

Creates an in-memory backend instance. No arguments required.

```typescript
import { createBackend } from "@universal-lock/memory";

const backend = createBackend();
```

## When to Use

- Development and testing
- Single-process Node.js applications
- Prototyping before switching to a distributed backend

## Limitations

- Locks are **not** shared across processes or servers. For distributed locking, use [`@universal-lock/redis`](https://www.npmjs.com/package/@universal-lock/redis).

## License

[MIT](https://github.com/lucasrainett/universal-lock/blob/master/LICENSE)
