export type AsyncFunction<R extends any = any, P extends any[] = any[]> = (
	...args: P
) => Promise<R>;

export type BackendSetupFunction = () => Promise<void>;
export type BackendAcquireFunction = (lockName: string, stale: number) => Promise<void>;
export type BackendRenewFunction = (lockName: string) => Promise<void>;
export type BackendReleaseFunction = (lockName: string) => Promise<void>;

export type Backend = {
	setup: BackendSetupFunction;
	acquire: BackendAcquireFunction;
	renew: BackendRenewFunction;
	release: BackendReleaseFunction;
};

export type BackendFactory = (...args: any[]) => Backend;

export type LockConfiguration = {
	acquireInterval: number; // retry acquiring lock every retryTimeout milliseconds
	acquireFailTimeout: number; // fail if acquire lock takes longer than this
	stale: number; // ignore locks that are older than this
	renewInterval: number; // lock will renew every renewTimeout milliseconds
	runningTimeout: number; // max time the handler can take to run the code or fail
};


export type LockReleaseFunction = () => Promise<void>;
export type LockAcquireFunction = (lockName: string) => Promise<LockReleaseFunction>;

export type Lock = {acquire: LockAcquireFunction};

