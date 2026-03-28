# Contributing

Thank you for your interest in contributing to universal-lock!

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork: `git clone https://github.com/<your-username>/universal-lock.git`
3. Install dependencies: `pnpm install`
4. Run tests: `pnpm test`
5. Run linting: `pnpm lint`

## Development

This is a monorepo managed with pnpm workspaces.

```bash
pnpm test       # Run tests with coverage
pnpm lint       # Run ESLint
pnpm format     # Format code with Prettier
pnpm build      # Build all packages
```

## Project Structure

```
packages/
  types/          → @universal-lock/types (shared type definitions)
  core/           → universal-lock (lock factory, decorator)
  memory/         → @universal-lock/memory
  web-locks/      → @universal-lock/web-locks
  local-storage/  → @universal-lock/local-storage
  redis/          → @universal-lock/redis
```

## Contribution Flow

### 1. Create a branch

Branch from `master` with a descriptive name:

```bash
git checkout master
git pull origin master
git checkout -b feat/my-feature
```

### 2. Make your changes

- Add or modify code in the relevant package(s) under `packages/`
- Add or update tests for any new or changed functionality
- Run `pnpm test` and `pnpm lint` to verify everything passes

### 3. Open a Pull Request

Push your branch and open a PR targeting `master`:

```bash
git push origin feat/my-feature
```

CI will automatically run lint, tests, and build on Node.js 22. All checks must pass before merging.

### 4. Review and merge

Once approved and CI passes, a maintainer will merge your PR into `master`.

### 5. Automatic release

After merge, the release workflow automatically:

1. Detects which packages have source changes since their last published version
2. Bumps the patch version for changed packages
3. Publishes to npm
4. Creates git tags (e.g., `@universal-lock/memory@0.0.3`)
5. Commits the version bumps back to `master`

No manual versioning, changelogs, or publish steps are needed.

## Adding a Backend

To create a new backend, create a new package under `packages/` and implement the `Backend` interface from `@universal-lock/types`:

1. Create the package directory:

```bash
mkdir -p packages/my-backend/src
```

2. Create `packages/my-backend/package.json`:

```json
{
	"name": "@universal-lock/my-backend",
	"version": "0.0.0",
	"main": "dist/index.js",
	"module": "dist/index.mjs",
	"types": "dist/index.d.ts",
	"exports": {
		".": {
			"import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
			"require": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
		}
	},
	"files": ["/dist"],
	"scripts": { "build": "tsup", "clean": "rm -rf dist" },
	"dependencies": { "@universal-lock/types": "workspace:*" }
}
```

3. Implement the backend in `packages/my-backend/src/index.ts`:

```typescript
import type { Backend } from "@universal-lock/types";

export const createBackend = (): Backend => {
	return {
		setup: async () => {
			/* initialize */
		},
		acquire: async (lockName, stale, lockId) => {
			/* acquire or throw */
		},
		renew: async (lockName, lockId) => {
			/* renew or throw */
		},
		release: async (lockName, lockId) => {
			/* release or throw */
		},
	};
};
```

4. Create `packages/my-backend/tsup.config.ts`:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	target: "es2020",
	sourcemap: true,
	external: ["@universal-lock/types"],
});
```

5. Create `packages/my-backend/tsconfig.json`:

```json
{
	"extends": "../../tsconfig.json",
	"compilerOptions": { "outDir": "dist" },
	"include": ["src"],
	"exclude": ["**/*.spec.ts"]
}
```

The `lockId` parameter is a unique ID for ownership verification. Your backend must:

- Throw if `acquire` is called on an already-held, non-stale lock
- Throw if `renew` or `release` is called with a mismatched `lockId`
- Throw if `renew` or `release` is called on a non-existent lock

## Reporting Issues

Please use [GitHub Issues](https://github.com/lucasrainett/universal-lock/issues) to report bugs or request features.
