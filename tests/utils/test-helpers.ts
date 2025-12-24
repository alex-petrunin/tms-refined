import { vi } from 'vitest';

/**
 * Common test helpers and utilities
 */

/**
 * Creates a mock repository with common methods
 */
export function createMockRepository<T>() {
  return {
    save: vi.fn(),
    findByID: vi.fn(),
    findById: vi.fn(),
    findByIdempotencyKey: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  } as unknown as T;
}

/**
 * Waits for a specified amount of time (useful for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a promise that resolves after the next tick
 */
export function nextTick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Asserts that a function throws an error with a specific message
 */
export async function expectError(
  fn: () => Promise<unknown> | unknown,
  expectedMessage?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (error instanceof Error) {
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(
          `Expected error message to include "${expectedMessage}", but got "${error.message}"`
        );
      }
      return;
    }
    throw error;
  }
}

/**
 * Resets all mocks between tests
 */
export function resetMocks() {
  vi.clearAllMocks();
}

