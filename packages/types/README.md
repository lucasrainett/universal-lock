# @universal-lock/types

Shared TypeScript type definitions for the [`universal-lock`](https://github.com/lucasrainett/universal-lock) ecosystem.

## Installation

```bash
npm install -D @universal-lock/types
```

> **Note:** You typically don't need to install this package directly. Types are bundled into each package's `.d.ts` files at build time. Install this package only if you need to import types directly (e.g., when implementing a custom backend).

## Types

### Backend

```typescript
type BackendSetupFunction = () => Promise<void>;
type BackendAcquireFunction = (lockName: string, stale: number, lockId: string) => Promise<void>;
type BackendRenewFunction = (lockName: string, lockId: string) => Promise<void>;
type BackendReleaseFunction = (lockName: string, lockId: string) => Promise<void>;

type Backend = {
	setup: BackendSetupFunction;
	acquire: BackendAcquireFunction;
	renew: BackendRenewFunction;
	release: BackendReleaseFunction;
};

type BackendFactory = (...args: any[]) => Backend;
```

### Utility

```typescript
type AsyncFunction<R = unknown, P extends unknown[] = unknown[]> = (...args: P) => Promise<R>;
```

### Lock

```typescript
type Lock = { acquire: LockAcquireFunction };

type LockAcquireFunction = (lockName: string) => Promise<LockReleaseFunction>;

type LockReleaseFunction = (() => Promise<void>) & { signal: AbortSignal };
```

### Configuration

```typescript
type LockConfiguration = {
	acquireInterval: number;
	acquireFailTimeout: number;
	stale: number;
	renewInterval: number;
	maxHoldTime: number;
	onLockLost: (lockName: string, reason: "renewFailed" | "timeout") => void;
	onEvent: (event: LockEvent) => void;
};
```

### Events

```typescript
type LockEvent = { type: "acquired"; lockName: string } | { type: "released"; lockName: string } | { type: "renewed"; lockName: string } | { type: "renewFailed"; lockName: string; error: unknown } | { type: "lockLost"; lockName: string; reason: "renewFailed" | "timeout" } | { type: "acquireTimeout"; lockName: string };
```

### Lock Entry Types

Used by backend implementations:

```typescript
type TimestampLockEntry = { lockId: string; timestamp: number };
type CallbackLockEntry = { lockId: string; release: () => void };
```

## License

[MIT](https://github.com/lucasrainett/universal-lock/blob/master/LICENSE)
