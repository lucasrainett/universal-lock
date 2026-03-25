import { lockFactory, lockDecoratorFactory } from "./lock";
import { memoryBackendFactory } from "./backends/MemoryBackend";

export { memoryBackendFactory, lockFactory, lockDecoratorFactory };

export type {
	AsyncFunction,
	Backend,
	BackendFactory,
	BackendSetupFunction,
	BackendAcquireFunction,
	BackendRenewFunction,
	BackendReleaseFunction,
	Lock,
	LockConfiguration,
	LockAcquireFunction,
	LockReleaseFunction,
} from "./types";
