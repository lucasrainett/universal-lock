# Contributing

Thank you for your interest in contributing to universal-lock!

## Getting Started

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Run tests: `pnpm test`
4. Run linting: `pnpm lint`

## Development

```bash
pnpm test       # Run tests with coverage
pnpm lint       # Run ESLint
pnpm format     # Format code with Prettier
pnpm build      # Build the library
```

## Pull Requests

- Create a feature branch from `master`
- Add tests for new functionality
- Ensure all tests pass and linting is clean
- Keep changes focused and minimal

## Adding a Backend

To create a new backend, implement the `Backend` interface from `src/types.ts`:

```typescript
import { Backend } from "universal-lock";

const myBackend: Backend = {
	setup: async () => {
		/* initialize */
	},
	acquire: async (lockName, stale, value) => {
		/* acquire or throw */
	},
	renew: async (lockName, value) => {
		/* renew or throw */
	},
	release: async (lockName, value) => {
		/* release or throw */
	},
};
```

The `value` parameter is a unique ID for ownership verification. Your backend must:

- Throw if `acquire` is called on an already-held, non-stale lock
- Throw if `renew` or `release` is called with a mismatched `value`
- Throw if `renew` or `release` is called on a non-existent lock

## Reporting Issues

Please use [GitHub Issues](https://github.com/lucasrainett/universal-lock/issues) to report bugs or request features.
