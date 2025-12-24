import { describe, it, expect } from 'vitest';
import { TestRun, TestStatus } from '@domain/entities/TestRun';
import {
  createTestRun,
  createTestCaseID,
  createTestSuiteID,
  createExecutionTargetSnapshot,
} from '../utils/test-factories';
import { ExecutionTargetType } from '@domain/enums/ExecutionTargetType';

describe('TestRun', () => {
  describe('constructor', () => {
    it('should create a test run with valid data', () => {
      const testRun = createTestRun();

      expect(testRun.id).toBeDefined();
      expect(testRun.testCaseIDs.length).toBeGreaterThan(0);
      expect(testRun.testSuiteID).toBeDefined();
      expect(testRun.executionTarget).toBeDefined();
      expect(testRun.status).toBe(TestStatus.PENDING);
    });

    it('should throw error if testCaseIDs is empty', () => {
      const suiteID = createTestSuiteID();
      const executionTarget = createExecutionTargetSnapshot();

      expect(() => {
        new TestRun('run-1', [], suiteID, executionTarget);
      }).toThrow('TestRun must have at least one TestCase');
    });

    it('should throw error if executionTarget is undefined', () => {
      const testCaseID = createTestCaseID();
      const suiteID = createTestSuiteID();

      expect(() => {
        new TestRun('run-1', [testCaseID], suiteID, undefined as any);
      }).toThrow('TestRun must have an ExecutionTarget');
    });
  });

  describe('start', () => {
    it('should change status from PENDING to RUNNING', () => {
      const testRun = createTestRun();

      expect(testRun.status).toBe(TestStatus.PENDING);
      testRun.start();
      expect(testRun.status).toBe(TestStatus.RUNNING);
    });

    it('should throw error if status is not PENDING', () => {
      const testRun = createTestRun();
      testRun.start(); // Change to RUNNING

      expect(() => {
        testRun.start();
      }).toThrow('Cannot start TestRun');
    });
  });

  describe('markAwaiting', () => {
    it('should change status to AWAITING_EXTERNAL_RESULTS', () => {
      const testRun = createTestRun();

      testRun.markAwaiting();
      expect(testRun.status).toBe(TestStatus.AWAITING_EXTERNAL_RESULTS);
    });
  });

  describe('complete', () => {
    it('should mark test run as PASSED when passed is true', () => {
      const testRun = createTestRun();
      testRun.start(); // Change to RUNNING

      testRun.complete(true);
      expect(testRun.status).toBe(TestStatus.PASSED);
    });

    it('should mark test run as FAILED when passed is false', () => {
      const testRun = createTestRun();
      testRun.start(); // Change to RUNNING

      testRun.complete(false);
      expect(testRun.status).toBe(TestStatus.FAILED);
    });

    it('should complete from AWAITING_EXTERNAL_RESULTS status', () => {
      const testRun = createTestRun();
      testRun.markAwaiting();

      testRun.complete(true);
      expect(testRun.status).toBe(TestStatus.PASSED);
    });

    it('should not change status if not RUNNING or AWAITING_EXTERNAL_RESULTS', () => {
      const testRun = createTestRun();
      testRun.start();
      testRun.complete(true); // Now PASSED

      const originalStatus = testRun.status;
      testRun.complete(false);
      expect(testRun.status).toBe(originalStatus); // Should remain PASSED
    });
  });
});

