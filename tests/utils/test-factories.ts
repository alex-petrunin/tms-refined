import { TestCase, TestCaseID } from '@domain/entities/TestCase';
import { TestSuite, TestSuiteID } from '@domain/entities/TestSuite';
import { TestRun, TestRunID } from '@domain/entities/TestRun';
import { ExecutionTargetSnapshot } from '@domain/valueObjects/ExecutionTarget';
import { ExecutionTargetType } from '@domain/enums/ExecutionTargetType';

/**
 * Factory functions for creating test entities with sensible defaults
 */

export function createTestCase(overrides?: {
  id?: TestCaseID;
  summary?: string;
  description?: string;
}): TestCase {
  return new TestCase(
    overrides?.id ?? `tc-${crypto.randomUUID()}`,
    overrides?.summary ?? 'Test Case Summary',
    overrides?.description ?? 'Test Case Description'
  );
}

export function createTestCaseID(): TestCaseID {
  return `tc-${crypto.randomUUID()}`;
}

export function createTestSuite(overrides?: {
  id?: TestSuiteID;
  name?: string;
  description?: string;
  testCaseIDs?: TestCaseID[];
}): TestSuite {
  return new TestSuite(
    overrides?.id ?? `suite-${crypto.randomUUID()}`,
    overrides?.name ?? 'Test Suite',
    overrides?.description ?? 'Test Suite Description',
    overrides?.testCaseIDs ?? []
  );
}

export function createTestSuiteID(): TestSuiteID {
  return `suite-${crypto.randomUUID()}`;
}

export function createExecutionTargetSnapshot(
  overrides?: {
    id?: string;
    name?: string;
    type?: ExecutionTargetType;
    ref?: string;
  }
): ExecutionTargetSnapshot {
  return new ExecutionTargetSnapshot(
    overrides?.id ?? `target-${crypto.randomUUID()}`,
    overrides?.name ?? 'Test Execution Target',
    overrides?.type ?? ExecutionTargetType.MANUAL,
    overrides?.ref ?? 'manual-ref-1'
  );
}

export function createTestRun(overrides?: {
  id?: TestRunID;
  testCaseIDs?: TestCaseID[];
  testSuiteID?: TestSuiteID;
  executionTarget?: ExecutionTargetSnapshot;
}): TestRun {
  const testCaseID = createTestCaseID();
  const suiteID = createTestSuiteID();
  const executionTarget = overrides?.executionTarget ?? createExecutionTargetSnapshot();

  return new TestRun(
    overrides?.id ?? `run-${crypto.randomUUID()}`,
    overrides?.testCaseIDs ?? [testCaseID],
    overrides?.testSuiteID ?? suiteID,
    executionTarget
  );
}

export function createTestRunID(): TestRunID {
  return `run-${crypto.randomUUID()}`;
}

