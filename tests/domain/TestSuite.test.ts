import { describe, it, expect, beforeEach } from 'vitest';
import { TestSuite, TestSuiteID } from '@domain/entities/TestSuite';
import { TestCaseID } from '@domain/entities/TestCase';
import {
  createTestSuite,
  createTestSuiteID,
  createTestCaseID,
} from '../utils/test-factories';

describe('TestSuite', () => {
  let suite: TestSuite;
  let suiteID: TestSuiteID;
  let testCaseID1: TestCaseID;
  let testCaseID2: TestCaseID;
  let testCaseID3: TestCaseID;

  beforeEach(() => {
    suiteID = createTestSuiteID();
    testCaseID1 = createTestCaseID();
    testCaseID2 = createTestCaseID();
    testCaseID3 = createTestCaseID();
  });

  describe('constructor', () => {
    it('should create a test suite with all properties', () => {
      const name = 'Test Suite Name';
      const description = 'Test Suite Description';
      const testCaseIDs = [testCaseID1, testCaseID2];

      suite = new TestSuite(suiteID, name, description, testCaseIDs);

      expect(suite.id).toBe(suiteID);
      expect(suite.name).toBe(name);
      expect(suite.description).toBe(description);
      expect(suite.testCaseIDs).toEqual(testCaseIDs);
    });

    it('should create a test suite with empty test case IDs array', () => {
      suite = new TestSuite(suiteID, 'Name', 'Description', []);

      expect(suite.id).toBe(suiteID);
      expect(suite.testCaseIDs).toEqual([]);
      expect(suite.testCaseIDs.length).toBe(0);
    });

    it('should allow name and description to be modified', () => {
      suite = createTestSuite();

      suite.name = 'Updated Name';
      suite.description = 'Updated Description';

      expect(suite.name).toBe('Updated Name');
      expect(suite.description).toBe('Updated Description');
    });

    it('should have readonly id property that cannot be reassigned', () => {
      suite = createTestSuite();
      const originalId = suite.id;

      // Verify id is set correctly
      expect(suite.id).toBe(originalId);
      // Note: readonly is a TypeScript compile-time check, not runtime
      // Attempting to reassign will cause a TypeScript compilation error
    });
  });

  describe('addTestCase', () => {
    beforeEach(() => {
      suite = new TestSuite(suiteID, 'Test Suite', 'Description', []);
    });

    it('should add a test case ID to the suite', () => {
      suite.addTestCase(testCaseID1);

      expect(suite.testCaseIDs).toContain(testCaseID1);
      expect(suite.testCaseIDs.length).toBe(1);
    });

    it('should add multiple test case IDs', () => {
      suite.addTestCase(testCaseID1);
      suite.addTestCase(testCaseID2);
      suite.addTestCase(testCaseID3);

      expect(suite.testCaseIDs).toContain(testCaseID1);
      expect(suite.testCaseIDs).toContain(testCaseID2);
      expect(suite.testCaseIDs).toContain(testCaseID3);
      expect(suite.testCaseIDs.length).toBe(3);
    });

    it('should not add duplicate test case IDs', () => {
      suite.addTestCase(testCaseID1);
      suite.addTestCase(testCaseID1);

      expect(suite.testCaseIDs).toContain(testCaseID1);
      expect(suite.testCaseIDs.length).toBe(1);
    });

    it('should not add duplicate when suite already has test cases', () => {
      suite.addTestCase(testCaseID1);
      suite.addTestCase(testCaseID2);
      suite.addTestCase(testCaseID1); // Duplicate

      expect(suite.testCaseIDs.length).toBe(2);
      expect(suite.testCaseIDs.filter((id) => id === testCaseID1).length).toBe(1);
    });

    it('should add test case ID to existing array', () => {
      suite = new TestSuite(suiteID, 'Name', 'Description', [testCaseID1]);

      suite.addTestCase(testCaseID2);

      expect(suite.testCaseIDs).toContain(testCaseID1);
      expect(suite.testCaseIDs).toContain(testCaseID2);
      expect(suite.testCaseIDs.length).toBe(2);
    });
  });

  describe('removeTestCase', () => {
    beforeEach(() => {
      suite = new TestSuite(suiteID, 'Test Suite', 'Description', [
        testCaseID1,
        testCaseID2,
        testCaseID3,
      ]);
    });

    it('should remove a test case ID from the suite', () => {
      suite.removeTestCase(testCaseID2);

      expect(suite.testCaseIDs).not.toContain(testCaseID2);
      expect(suite.testCaseIDs).toContain(testCaseID1);
      expect(suite.testCaseIDs).toContain(testCaseID3);
      expect(suite.testCaseIDs.length).toBe(2);
    });

    it('should remove the first test case ID', () => {
      suite.removeTestCase(testCaseID1);

      expect(suite.testCaseIDs).not.toContain(testCaseID1);
      expect(suite.testCaseIDs).toContain(testCaseID2);
      expect(suite.testCaseIDs).toContain(testCaseID3);
    });

    it('should remove the last test case ID', () => {
      suite.removeTestCase(testCaseID3);

      expect(suite.testCaseIDs).not.toContain(testCaseID3);
      expect(suite.testCaseIDs).toContain(testCaseID1);
      expect(suite.testCaseIDs).toContain(testCaseID2);
    });

    it('should handle removing non-existent test case ID gracefully', () => {
      const nonExistentID = createTestCaseID();
      const originalLength = suite.testCaseIDs.length;

      suite.removeTestCase(nonExistentID);

      expect(suite.testCaseIDs.length).toBe(originalLength);
      expect(suite.testCaseIDs).toContain(testCaseID1);
      expect(suite.testCaseIDs).toContain(testCaseID2);
      expect(suite.testCaseIDs).toContain(testCaseID3);
    });

    it('should remove all occurrences if duplicate exists (edge case)', () => {
      // Manually add duplicate (though addTestCase prevents this)
      suite.testCaseIDs.push(testCaseID1);

      suite.removeTestCase(testCaseID1);

      expect(suite.testCaseIDs).not.toContain(testCaseID1);
    });

    it('should handle removing from empty suite', () => {
      suite = new TestSuite(suiteID, 'Name', 'Description', []);

      suite.removeTestCase(testCaseID1);

      expect(suite.testCaseIDs.length).toBe(0);
    });
  });

  describe('getTestCaseIds', () => {
    beforeEach(() => {
      suite = new TestSuite(suiteID, 'Test Suite', 'Description', [
        testCaseID1,
        testCaseID2,
        testCaseID3,
      ]);
    });

    it('should return a copy of test case IDs array', () => {
      const ids = suite.getTestCaseIds();

      expect(ids).toEqual([testCaseID1, testCaseID2, testCaseID3]);
      expect(ids).not.toBe(suite.testCaseIDs); // Different reference
    });

    it('should return empty array for suite with no test cases', () => {
      suite = new TestSuite(suiteID, 'Name', 'Description', []);

      const ids = suite.getTestCaseIds();

      expect(ids).toEqual([]);
      expect(ids.length).toBe(0);
    });

    it('should return a new array instance each time', () => {
      const ids1 = suite.getTestCaseIds();
      const ids2 = suite.getTestCaseIds();

      expect(ids1).toEqual(ids2);
      expect(ids1).not.toBe(ids2); // Different instances
    });

    it('should not be affected by modifications to returned array', () => {
      const ids = suite.getTestCaseIds();
      ids.push(createTestCaseID());

      expect(suite.testCaseIDs.length).toBe(3);
      expect(ids.length).toBe(4);
    });

    it('should reflect changes after adding test cases', () => {
      suite = new TestSuite(suiteID, 'Name', 'Description', []);

      const idsBefore = suite.getTestCaseIds();
      expect(idsBefore.length).toBe(0);

      suite.addTestCase(testCaseID1);
      suite.addTestCase(testCaseID2);

      const idsAfter = suite.getTestCaseIds();
      expect(idsAfter.length).toBe(2);
      expect(idsAfter).toContain(testCaseID1);
      expect(idsAfter).toContain(testCaseID2);
    });

    it('should reflect changes after removing test cases', () => {
      const idsBefore = suite.getTestCaseIds();
      expect(idsBefore.length).toBe(3);

      suite.removeTestCase(testCaseID2);

      const idsAfter = suite.getTestCaseIds();
      expect(idsAfter.length).toBe(2);
      expect(idsAfter).not.toContain(testCaseID2);
      expect(idsAfter).toContain(testCaseID1);
      expect(idsAfter).toContain(testCaseID3);
    });
  });

  describe('integration', () => {
    it('should handle adding and removing test cases in sequence', () => {
      suite = new TestSuite(suiteID, 'Test Suite', 'Description', []);

      suite.addTestCase(testCaseID1);
      suite.addTestCase(testCaseID2);
      suite.addTestCase(testCaseID3);

      expect(suite.getTestCaseIds().length).toBe(3);

      suite.removeTestCase(testCaseID2);

      expect(suite.getTestCaseIds().length).toBe(2);
      expect(suite.getTestCaseIds()).toContain(testCaseID1);
      expect(suite.getTestCaseIds()).toContain(testCaseID3);
      expect(suite.getTestCaseIds()).not.toContain(testCaseID2);

      suite.addTestCase(testCaseID2);

      expect(suite.getTestCaseIds().length).toBe(3);
      expect(suite.getTestCaseIds()).toContain(testCaseID2);
    });

    it('should maintain test case order', () => {
      suite = new TestSuite(suiteID, 'Test Suite', 'Description', []);

      suite.addTestCase(testCaseID1);
      suite.addTestCase(testCaseID2);
      suite.addTestCase(testCaseID3);

      const ids = suite.getTestCaseIds();
      expect(ids[0]).toBe(testCaseID1);
      expect(ids[1]).toBe(testCaseID2);
      expect(ids[2]).toBe(testCaseID3);
    });
  });
});

