# @universal-lock/web-locks

Web Locks API backend for [`universal-lock`](https://github.com/lucasrainett/universal-lock). Provides cross-tab locking using the native browser [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).

## Installation

```bash
npm install universal-lock @universal-lock/web-locks
```

## Usage

```typescript
import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/web-locks";

const lock = lockFactory(createBackend());

const release = await lock.acquire("my-resource");
try {
	// critical section — safe across browser tabs
} finally {
	await release();
}
```

## API

### `createBackend()`

Creates a Web Locks API backend instance. No arguments required.

```typescript
import { createBackend } from "@universal-lock/web-locks";

const backend = createBackend();
```

## How It Works

Uses `navigator.locks.request()` with `ifAvailable: true` mode. Locks are managed natively by the browser — no external storage is needed. Lock references and release callbacks are stored in memory.

## Advantages

- **Automatic cleanup** — locks are released if a tab crashes or navigates away
- **True atomicity** — OS-level lock guarantees, no race conditions
- **No storage needed** — no localStorage or cookies involved

## When to Use

- Cross-tab locking in modern browsers (recommended over localStorage backend)
- Applications that need reliable lock cleanup on tab crash

## Limitations

- Throws during `setup` if the Web Locks API is unavailable. For older browsers, use [`@universal-lock/local-storage`](https://www.npmjs.com/package/@universal-lock/local-storage) as a fallback.
- Browser-only — not available in Node.js.

## Browser Support

The Web Locks API is supported in Chrome 69+, Firefox 96+, Safari 15.4+, and Edge 79+. See [Can I use](https://caniuse.com/web-locks) for details.

## License

[MIT](https://github.com/lucasrainett/universal-lock/blob/master/LICENSE)
