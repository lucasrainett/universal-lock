import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/memory";

export const lock = lockFactory(createBackend(), {
	acquireInterval: 50,
	acquireFailTimeout: 5000,
	stale: 2000,
	renewInterval: 200,
	maxHoldTime: 10000,
});
