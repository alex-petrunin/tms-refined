import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunTestCasesUseCase } from '@app/usecases/RunTestCases';
import { TestRunRepository } from '@app/ports/TestRunRepository';
import { ExecutionTriggerPort } from '@app/ports/ExecutionTriggerPort';
import { TestRun } from '@domain/entities/TestRun';
import { TestStatus } from '@domain/entities/TestRun';
import {
  createTestSuiteID,
  createTestCaseID,
  createExecutionTargetSnapshot,
} from '../utils/test-factories';
import { createMockRepository } from '../utils/test-helpers';

describe('RunTestCasesUseCase', () => {
  let useCase: RunTestCasesUseCase;
  let mockTestRunRepo: TestRunRepository;
  let mockTriggerPort: ExecutionTriggerPort;

  beforeEach(() => {
    // Create mocks
    mockTestRunRepo = createMockRepository<TestRunRepository>();
    mockTriggerPort = {
      trigger: vi.fn().mockResolvedValue(undefined),
    } as unknown as ExecutionTriggerPort;

    useCase = new RunTestCasesUseCase(mockTestRunRepo, mockTriggerPort);
  });

  it('should create test runs for each test case in MANAGED mode', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID(), createTestCaseID()];
    const executionTarget = createExecutionTargetSnapshot();

    const testRunIDs = await useCase.execute({
      suiteID,
      testCaseIDs,
      executionTarget,
      executionMode: 'MANAGED',
    });

    expect(testRunIDs).toHaveLength(2);
    expect(mockTestRunRepo.save).toHaveBeenCalledTimes(2);
    expect(mockTriggerPort.trigger).toHaveBeenCalledTimes(2);

    // Verify that test runs were created with correct status
    const savedTestRuns = (mockTestRunRepo.save as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[0] as TestRun
    );

    savedTestRuns.forEach((testRun) => {
      expect(testRun.status).toBe(TestStatus.RUNNING);
      expect(testRun.testCaseIDs.length).toBe(1);
      expect(testRun.testSuiteID).toBe(suiteID);
      expect(testRun.executionTarget).toBe(executionTarget);
    });
  });

  it('should create test runs in OBSERVED mode without triggering execution', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID()];
    const executionTarget = createExecutionTargetSnapshot();

    const testRunIDs = await useCase.execute({
      suiteID,
      testCaseIDs,
      executionTarget,
      executionMode: 'OBSERVED',
    });

    expect(testRunIDs).toHaveLength(1);
    expect(mockTestRunRepo.save).toHaveBeenCalledTimes(1);
    expect(mockTriggerPort.trigger).not.toHaveBeenCalled();

    const savedTestRun = (mockTestRunRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as TestRun;
    expect(savedTestRun.status).toBe(TestStatus.AWAITING_EXTERNAL_RESULTS);
  });

  it('should default to MANAGED mode when executionMode is not specified', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID()];
    const executionTarget = createExecutionTargetSnapshot();

    await useCase.execute({
      suiteID,
      testCaseIDs,
      executionTarget,
    });

    expect(mockTriggerPort.trigger).toHaveBeenCalledTimes(1);
  });

  it('should create unique test run IDs for each test case', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID(), createTestCaseID(), createTestCaseID()];
    const executionTarget = createExecutionTargetSnapshot();

    const testRunIDs = await useCase.execute({
      suiteID,
      testCaseIDs,
      executionTarget,
    });

    expect(testRunIDs).toHaveLength(3);
    // All IDs should be unique
    expect(new Set(testRunIDs).size).toBe(3);
  });
});

