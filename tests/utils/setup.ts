/**
 * Global test setup file
 * This file runs before all tests
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';

// Global setup (runs once before all tests)
beforeAll(() => {
  // Add any global setup logic here
  // For example: initialize test database, set up test environment, etc.
});

// Global teardown (runs once after all tests)
afterAll(() => {
  // Add any global cleanup logic here
  // For example: close database connections, clean up test files, etc.
});

// Setup before each test (runs before every test)
beforeEach(() => {
  // Add any per-test setup logic here
  // For example: reset mocks, clear caches, etc.
});

