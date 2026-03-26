# @universal-lock/types

Shared TypeScript type definitions for the [`universal-lock`](https://github.com/lucasrainett/universal-lock) ecosystem.

## Installation

```bash
npm install @universal-lock/types
```

> **Note:** You typically don't need to install this package directly. It is included as a dependency of `universal-lock` and all backend packages.

## Types

### Backend

```typescript
type Backend = {
	setup: () => Promise<void>;
	acquire: (lockName: string, stale: number, lockId: string) => Promise<void>;
	renew: (lockName: string, lockId: string) => Promise<void>;
	release: (lockName: string, lockId: string) => Promise<void>;
};
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
	runningTimeout: number;
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
