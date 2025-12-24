# Vitest Test Framework Setup

## Overview

Vitest has been successfully configured for the TMS project with proper TypeScript support, path aliases, and test utilities.

## Configuration Files

### `vitest.config.ts`
Main Vitest configuration file with:
- TypeScript support via `vite-tsconfig-paths` plugin
- Path alias resolution (`@app`, `@domain`, `@infra`, `@backend`, `@`)
- Node.js test environment
- Coverage configuration (v8 provider)
- Test setup file integration

### `tsconfig.test.json`
TypeScript configuration for tests extending the main `tsconfig.json` with:
- Vitest globals types
- Proper module resolution
- Test file inclusion

## Test Utilities

### Factories (`tests/utils/test-factories.ts`)
Factory functions for creating test entities:
- `createTestCase()` - Creates TestCase entities
- `createTestSuite()` - Creates TestSuite entities  
- `createTestRun()` - Creates TestRun entities
- `createExecutionTargetSnapshot()` - Creates ExecutionTargetSnapshot
- ID generators for each entity type

### Helpers (`tests/utils/test-helpers.ts`)
Common test utilities:
- `createMockRepository<T>()` - Creates mock repositories
- `wait(ms)` - Async wait utility
- `nextTick()` - Event loop tick utility
- `expectError()` - Error assertion helper
- `resetMocks()` - Mock reset utility

### Setup (`tests/utils/setup.ts`)
Global test setup file that runs before all tests.

## Test Scripts

Available npm scripts:
- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI (requires `@vitest/ui` package)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:coverage:ui` - Run tests with UI and coverage

## Example Tests

Example test files demonstrating the setup:
- `tests/application/CreateTestCase.test.ts` - Use case testing example
- `tests/application/RunTestCases.test.ts` - Mock usage example
- `tests/domain/TestRun.test.ts` - Domain entity testing example

## Path Aliases

The following path aliases work in tests:
- `@app/*` → `src/backend/application/*`
- `@domain/*` → `src/backend/domain/*`
- `@infra/*` → `src/backend/infrastructure/*`
- `@backend/*` → `src/backend/*`
- `@/*` → `src/*`

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (recommended for development)
npm run test:watch

# With coverage
npm run test:coverage
```

## Optional: Vitest UI

If you want to use the Vitest UI, install it separately:

```bash
npm install --save-dev @vitest/ui
```

Then use:
```bash
npm run test:ui
```

## Next Steps

1. Write tests for your use cases in `tests/application/`
2. Write tests for domain entities in `tests/domain/`
3. Write tests for infrastructure adapters in `tests/infrastructure/`
4. Use test factories and helpers to keep tests DRY and maintainable

