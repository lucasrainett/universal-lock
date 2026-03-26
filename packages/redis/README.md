# @universal-lock/redis

Redis backend for [`universal-lock`](https://github.com/lucasrainett/universal-lock). Provides distributed locking across processes and servers using atomic Lua scripts.

## Installation

```bash
npm install universal-lock @universal-lock/redis
```

You also need a Redis client library such as [ioredis](https://www.npmjs.com/package/ioredis) or [node-redis](https://www.npmjs.com/package/redis).

## Usage

### With ioredis

```typescript
import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/redis";
import Redis from "ioredis";

const client = new Redis();
const redisClient = {
	eval: (script: string, keys: string[], args: string[]) => client.eval(script, keys.length, ...keys, ...args),
};

const lock = lockFactory(createBackend(redisClient));

const release = await lock.acquire("my-resource");
try {
	// critical section — safe across processes and servers
} finally {
	await release();
}
```

### With node-redis

```typescript
import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/redis";
import { createClient } from "redis";

const client = createClient();
await client.connect();
const redisClient = {
	eval: (script: string, keys: string[], args: string[]) => client.eval(script, { keys, arguments: args }),
};

const lock = lockFactory(createBackend(redisClient));
```

## API

### `createBackend(client, options?)`

Creates a Redis backend instance.

```typescript
import { createBackend } from "@universal-lock/redis";

const backend = createBackend(redisClient, {
	prefix: "my-app:", // key prefix (default: "universal-lock:")
});
```

### `RedisClient` interface

Any Redis client that implements this interface is supported:

```typescript
interface RedisClient {
	eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}
```

### Options

| Option   | Type     | Default             | Description                |
| -------- | -------- | ------------------- | -------------------------- |
| `prefix` | `string` | `"universal-lock:"` | Prefix for Redis key names |

## How It Works

All operations use atomic Lua scripts executed server-side on Redis:

- **Acquire** — `SET key value NX PX ttl` (set only if not exists, with TTL)
- **Renew** — Verify ownership, then `PEXPIRE` to extend TTL
- **Release** — Verify ownership, then `DEL` to remove

## Limitations

- Works with a **single Redis instance** only. For multi-instance quorum locking (Redlock algorithm), a dedicated implementation is needed.

## License

[MIT](https://github.com/lucasrainett/universal-lock/blob/master/LICENSE)
