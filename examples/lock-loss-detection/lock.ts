import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/memory";

export const lock = lockFactory(createBackend(), {
	maxHoldTime: 500,
	onLockLost: (lockName, reason) => {
		console.log(`[onLockLost] Lock "${lockName}" lost: ${reason}`);
	},
	onEvent: (event) => {
		console.log(`[event] ${event.type} — ${event.lockName}`);
	},
});
