import { Backend, BackendFactory } from "../types";

export const fileBackendFactory = ((lockFolderPath: string): Backend => {

	const setup = async () => {};
	const acquire = async () => {};
	const renew = async () => {};
	const release = async () => {};

	return {
		setup,
		acquire,
		renew,
		release,
	};

}) satisfies BackendFactory;
