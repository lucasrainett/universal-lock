export type AsyncFunction<R = unknown, P extends unknown[] = unknown[]> = (
	...args: P
) => Promise<R>;

export type BackendSetupFunction = () => Promise<void>;
export type BackendAcquireFunction = (
	lockName: string,
	stale: number,
	lockId: string,
) => Promise<void>;
export type BackendRenewFunction = (
	lockName: string,
	lockId: string,
) => Promise<void>;
export type BackendReleaseFunction = (
	lockName: string,
	lockId: string,
) => Promise<void>;

export type Backend = {
	setup: BackendSetupFunction;
	acquire: BackendAcquireFunction;
	renew: BackendRenewFunction;
	release: BackendReleaseFunction;
};

export type BackendFactory = (...args: any[]) => Backend;

export type LockEvent =
	| { type: "acquired"; lockName: string }
	| { type: "released"; lockName: string }
	| { type: "renewed"; lockName: string }
	| { type: "renewFailed"; lockName: string; error: unknown }
	| { type: "lockLost"; lockName: string; reason: "renewFailed" | "timeout" }
	| { type: "acquireTimeout"; lockName: string };

export type LockConfiguration = {
	acquireInterval: number;
	acquireFailTimeout: number;
	stale: number;
	renewInterval: number;
	maxHoldTime: number;
	onLockLost: (lockName: string, reason: "renewFailed" | "timeout") => void;
	onEvent: (event: LockEvent) => void;
};

export type LockReleaseFunction = (() => Promise<void>) & {
	signal: AbortSignal;
};
export type LockAcquireFunction = (
	lockName: string,
) => Promise<LockReleaseFunction>;

export type Lock = { acquire: LockAcquireFunction };

export type TimestampLockEntry = { lockId: string; timestamp: number };
export type CallbackLockEntry = { lockId: string; release: () => void };
