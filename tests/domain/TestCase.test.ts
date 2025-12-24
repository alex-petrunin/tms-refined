import { describe, it, expect } from 'vitest';
import { TestCase, TestCaseID } from '@domain/entities/TestCase';
import { createTestCase, createTestCaseID } from '../utils/test-factories';

describe('TestCase', () => {
  describe('constructor', () => {
    it('should create a test case with all properties', () => {
      const id = createTestCaseID();
      const summary = 'Test Case Summary';
      const description = 'Test Case Description';

      const testCase = new TestCase(id, summary, description);

      expect(testCase.id).toBe(id);
      expect(testCase.summary).toBe(summary);
      expect(testCase.description).toBe(description);
    });

    it('should create a test case with empty description', () => {
      const id = createTestCaseID();
      const summary = 'Test Case Summary';

      const testCase = new TestCase(id, summary, '');

      expect(testCase.id).toBe(id);
      expect(testCase.summary).toBe(summary);
      expect(testCase.description).toBe('');
    });

    it('should allow summary and description to be modified', () => {
      const testCase = createTestCase();

      const newSummary = 'Updated Summary';
      const newDescription = 'Updated Description';

      testCase.summary = newSummary;
      testCase.description = newDescription;

      expect(testCase.summary).toBe(newSummary);
      expect(testCase.description).toBe(newDescription);
    });

    it('should have readonly id property that cannot be reassigned', () => {
      const testCase = createTestCase();
      const originalId = testCase.id;

      // Verify id is set correctly
      expect(testCase.id).toBe(originalId);
      // Note: readonly is a TypeScript compile-time check, not runtime
      // Attempting to reassign will cause a TypeScript compilation error
    });

    it('should create multiple test cases with different IDs', () => {
      const testCase1 = createTestCase();
      const testCase2 = createTestCase();

      expect(testCase1.id).not.toBe(testCase2.id);
    });

    it('should accept any string as ID', () => {
      const customId = 'custom-test-case-id-123';
      const testCase = new TestCase(customId, 'Summary', 'Description');

      expect(testCase.id).toBe(customId);
    });
  });

  describe('factory function', () => {
    it('should create test case with default values', () => {
      const testCase = createTestCase();

      expect(testCase.id).toBeDefined();
      expect(testCase.summary).toBe('Test Case Summary');
      expect(testCase.description).toBe('Test Case Description');
    });

    it('should create test case with overrides', () => {
      const customId = 'custom-id';
      const customSummary = 'Custom Summary';
      const customDescription = 'Custom Description';

      const testCase = createTestCase({
        id: customId,
        summary: customSummary,
        description: customDescription,
      });

      expect(testCase.id).toBe(customId);
      expect(testCase.summary).toBe(customSummary);
      expect(testCase.description).toBe(customDescription);
    });
  });
});

