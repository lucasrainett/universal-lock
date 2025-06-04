import {
	Backend,
	BackendAcquireFunction,
	BackendFactory,
	BackendReleaseFunction,
	BackendRenewFunction,
	BackendSetupFunction
} from "../types";

export const memoryBackendFactory: BackendFactory = ((locks: Record<string, number> = {}): Backend => {

	const setup: BackendSetupFunction = async () => {};

	const acquire: BackendAcquireFunction = async (lockName, stale) => {
		const now = Date.now();
		const lockExists = !!locks[lockName];
		const lockExpired = lockExists && locks[lockName] + stale < now;
		if(!lockExists || lockExpired){
			locks[lockName] = now;
		}else{
			throw new Error(`${lockName} already locked`);
		}
	};

	const renew: BackendRenewFunction = async (lockName) => {
		locks[lockName] = Date.now();
	};

	const release: BackendReleaseFunction = async (lockName) => {
		delete locks[lockName];
	};

	return {
		setup,
		acquire,
		renew,
		release,
	};
});
