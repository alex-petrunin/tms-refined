# Testing Guide

This directory contains tests for the TMS (Test Management System) project using Vitest.

## Setup

The test framework is already configured. To run tests:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are organized to mirror the source code structure:

```
tests/
├── application/     # Tests for use cases
├── domain/          # Tests for domain entities
├── infrastructure/  # Tests for infrastructure adapters
└── utils/           # Test utilities and helpers
    ├── test-factories.ts  # Factory functions for creating test data
    ├── test-helpers.ts    # Common test utilities
    └── setup.ts           # Global test setup
```

## Writing Tests

### Basic Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourUseCase } from '@app/usecases/YourUseCase';

describe('YourUseCase', () => {
  let useCase: YourUseCase;

  beforeEach(() => {
    useCase = new YourUseCase(/* dependencies */);
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Using Test Factories

Test factories help create test data with sensible defaults:

```typescript
import { createTestCase, createTestRun } from '../utils/test-factories';

const testCase = createTestCase({
  summary: 'Custom Summary',
  description: 'Custom Description',
});

const testRun = createTestRun({
  testCaseIDs: ['tc-1', 'tc-2'],
});
```

### Using Mocks

Vitest provides powerful mocking capabilities:

```typescript
import { vi } from 'vitest';
import { createMockRepository } from '../utils/test-helpers';

const mockRepo = createMockRepository<YourRepository>();
// Or create custom mocks:
const mockService = {
  doSomething: vi.fn().mockResolvedValue('result'),
};
```

### Testing Async Code

Vitest handles async code naturally:

```typescript
it('should handle async operations', async () => {
  const result = await useCase.execute(input);
  expect(result).toBeDefined();
});
```

### Testing Error Cases

```typescript
it('should throw error when input is invalid', () => {
  expect(() => {
    entity.doSomething(invalidInput);
  }).toThrow('Expected error message');
});
```

## Path Aliases

The following path aliases are configured for tests:

- `@app/*` → `src/backend/application/*`
- `@domain/*` → `src/backend/domain/*`
- `@infra/*` → `src/backend/infrastructure/*`
- `@backend/*` → `src/backend/*`
- `@/*` → `src/*`

## Test Utilities

### Factories (`test-factories.ts`)

- `createTestCase()` - Create a TestCase entity
- `createTestSuite()` - Create a TestSuite entity
- `createTestRun()` - Create a TestRun entity
- `createExecutionTargetSnapshot()` - Create an ExecutionTargetSnapshot
- `createTestCaseID()`, `createTestSuiteID()`, `createTestRunID()` - Generate IDs

### Helpers (`test-helpers.ts`)

- `createMockRepository<T>()` - Create a mock repository
- `wait(ms)` - Wait for a specified time
- `nextTick()` - Wait for next event loop tick
- `expectError(fn, message?)` - Assert that a function throws an error
- `resetMocks()` - Reset all mocks

## Best Practices

1. **Use descriptive test names**: Test names should clearly describe what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear sections
3. **Use factories**: Use test factories instead of manually creating test data
4. **Isolate tests**: Each test should be independent and not rely on other tests
5. **Mock external dependencies**: Use mocks for repositories, ports, and external services
6. **Test edge cases**: Don't just test happy paths, test error cases and edge conditions
7. **Keep tests fast**: Avoid slow operations in unit tests

## Coverage

To generate coverage reports:

```bash
npm run test:coverage
```

Coverage reports will be generated in the `coverage/` directory.

