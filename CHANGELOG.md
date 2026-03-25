# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Monorepo structure with pnpm workspaces
- `@universal-lock/types` package for shared type definitions
- `@universal-lock/memory` package (extracted from core)
- `@universal-lock/web-locks` package — Web Locks API backend for cross-tab locking
- `@universal-lock/local-storage` package — LocalStorage backend with configurable prefix
- `TimestampLockEntry` and `CallbackLockEntry` shared types
- Lock ownership verification with unique lock IDs
- Acquire timeout (`acquireFailTimeout`) rejects if lock cannot be acquired in time
- Running timeout (`runningTimeout`) auto-releases locks held too long
- Double-release protection in `lockFactory` and `lockDecoratorFactory`
- `generateId` utility for isomorphic unique ID generation
- ESLint with TypeScript support and `consistent-type-imports` rule
- GitHub Actions CI/CD workflows
- Vitest for testing with coverage

### Changed

- Restructured as monorepo — backends are separate packages depending on `@universal-lock/types`
- Backend packages export `createBackend` instead of verbose factory names
- Renamed `lockDecoratoryFactory` to `lockDecoratorFactory`
- Replaced Webpack with tsup (ESM + CJS + IIFE output)
- Replaced Jest with Vitest
- Updated build target to ES2020
- Backend functions now require a `value` parameter for ownership verification
- Memory backend validates ownership on renew and release
- Stale lock check uses `<=` instead of `<`
- All type imports use `import type` syntax

### Removed

- Webpack, ts-loader, ts-node, rimraf, Jest dependencies
- Unimplemented FileBackend stub
- Backends removed from core package (now separate packages)

## [0.0.2] - 2025-06-04

### Added

- Memory backend with stale lock detection
- Lock factory with configurable intervals
- Lock decorator factory for wrapping async functions
- `asyncInterval` and `sleep` utilities

## [0.0.1] - 2025-06-04

### Added

- Initial project setup
