import { lockFactory, lockDecoratorFactory } from "./lock";

export { lockFactory, lockDecoratorFactory };

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
	TimestampLockEntry,
	CallbackLockEntry,
	LockEvent,
} from "@universal-lock/types";
