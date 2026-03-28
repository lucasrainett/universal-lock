import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/redis";
import Redis from "ioredis";

const client = new Redis();

const redisClient = {
	eval: (script: string, keys: string[], args: string[]) =>
		client.eval(script, keys.length, ...keys, ...args),
};

export const lock = lockFactory(createBackend(redisClient), {
	stale: 5000,
	renewInterval: 1000,
	maxHoldTime: 30000,
});

export { client };
