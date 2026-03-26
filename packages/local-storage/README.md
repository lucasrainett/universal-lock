# @universal-lock/local-storage

LocalStorage backend for [`universal-lock`](https://github.com/lucasrainett/universal-lock). Provides cross-tab locking in browsers using `localStorage`.

## Installation

```bash
npm install universal-lock @universal-lock/local-storage
```

## Usage

```typescript
import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/local-storage";

const lock = lockFactory(createBackend());

const release = await lock.acquire("my-resource");
try {
	// critical section — safe across browser tabs
} finally {
	await release();
}
```

## API

### `createBackend(prefix?)`

Creates a localStorage backend instance.

```typescript
import { createBackend } from "@universal-lock/local-storage";

const backend = createBackend(); // default prefix "universal-lock:"
const backend = createBackend("my-app:"); // custom prefix
```

| Parameter | Type     | Default             | Description                       |
| --------- | -------- | ------------------- | --------------------------------- |
| `prefix`  | `string` | `"universal-lock:"` | Prefix for localStorage key names |

## How It Works

Locks are stored as JSON in `localStorage` with a timestamp. A compare-and-swap (CAS) pattern is used: after writing a lock entry, it is immediately read back to verify the write succeeded. This significantly reduces race conditions between tabs.

## When to Use

- Cross-tab locking in browsers that **don't** support the Web Locks API
- Fallback for older browser environments

## Limitations

- `localStorage` is **not** truly atomic. The CAS verification reduces but does not eliminate race conditions. For stronger cross-tab guarantees, use [`@universal-lock/web-locks`](https://www.npmjs.com/package/@universal-lock/web-locks).
- Throws during `setup` if `localStorage` is unavailable (e.g., private browsing in some browsers, server-side rendering).

## License

[MIT](https://github.com/lucasrainett/universal-lock/blob/master/LICENSE)
