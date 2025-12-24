import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunTestCasesUseCase } from '@app/usecases/RunTestCases';
import { TestRunRepository } from '@app/ports/TestRunRepository';
import { ExecutionTriggerPort } from '@app/ports/ExecutionTriggerPort';
import { ExecutionTargetResolverPort } from '@app/ports/ExecutionTargetResolverPort';
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
  let mockExecutionTargetResolver: ExecutionTargetResolverPort;

  beforeEach(() => {
    // Create mocks
    mockTestRunRepo = createMockRepository<TestRunRepository>();
    mockTriggerPort = {
      trigger: vi.fn().mockResolvedValue(undefined),
    } as unknown as ExecutionTriggerPort;
    mockExecutionTargetResolver = {
      resolveExecutionTarget: vi.fn(),
    } as unknown as ExecutionTargetResolverPort;

    useCase = new RunTestCasesUseCase(
      mockTestRunRepo,
      mockTriggerPort,
      mockExecutionTargetResolver
    );
  });

  it('should create test runs grouped by execution target in MANAGED mode', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID(), createTestCaseID()];
    const executionTarget = createExecutionTargetSnapshot();

    // Mock resolver to return the same execution target for both test cases
    (mockExecutionTargetResolver.resolveExecutionTarget as ReturnType<typeof vi.fn>)
      .mockResolvedValue(executionTarget);

    // Mock idempotency check to return null (no existing test run)
    (mockTestRunRepo.findByIdempotencyKey as ReturnType<typeof vi.fn>)
      .mockResolvedValue(null);

    const testRunIDs = await useCase.execute({
      suiteID,
      testCaseIDs,
      executionMode: 'MANAGED',
    });

    // Should create one test run for the group (both test cases share same execution target)
    expect(testRunIDs).toHaveLength(1);
    expect(mockTestRunRepo.save).toHaveBeenCalledTimes(1);
    expect(mockTriggerPort.trigger).toHaveBeenCalledTimes(1);

    // Verify that test run was created with correct status and contains both test cases
    const savedTestRun = (mockTestRunRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as TestRun;
    expect(savedTestRun.status).toBe(TestStatus.RUNNING);
    expect(savedTestRun.testCaseIDs).toHaveLength(2);
    expect(savedTestRun.testCaseIDs).toEqual(expect.arrayContaining(testCaseIDs));
    expect(savedTestRun.testSuiteID).toBe(suiteID);
    expect(savedTestRun.executionTarget).toBe(executionTarget);
  });

  it('should create test runs in OBSERVED mode without triggering execution', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID()];
    const executionTarget = createExecutionTargetSnapshot();

    // Mock resolver to return execution target
    (mockExecutionTargetResolver.resolveExecutionTarget as ReturnType<typeof vi.fn>)
      .mockResolvedValue(executionTarget);

    // Mock idempotency check to return null (no existing test run)
    (mockTestRunRepo.findByIdempotencyKey as ReturnType<typeof vi.fn>)
      .mockResolvedValue(null);

    const testRunIDs = await useCase.execute({
      suiteID,
      testCaseIDs,
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

    // Mock resolver to return execution target
    (mockExecutionTargetResolver.resolveExecutionTarget as ReturnType<typeof vi.fn>)
      .mockResolvedValue(executionTarget);

    // Mock idempotency check to return null (no existing test run)
    (mockTestRunRepo.findByIdempotencyKey as ReturnType<typeof vi.fn>)
      .mockResolvedValue(null);

    await useCase.execute({
      suiteID,
      testCaseIDs,
    });

    expect(mockTriggerPort.trigger).toHaveBeenCalledTimes(1);
  });

  it('should group test cases by execution target', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID(), createTestCaseID(), createTestCaseID()];
    const executionTarget1 = createExecutionTargetSnapshot({ id: 'target-1' });
    const executionTarget2 = createExecutionTargetSnapshot({ id: 'target-2' });

    // Mock resolver: first two test cases use target1, third uses target2
    (mockExecutionTargetResolver.resolveExecutionTarget as ReturnType<typeof vi.fn>)
      .mockImplementation((testCaseID: string) => {
        if (testCaseID === testCaseIDs[0] || testCaseID === testCaseIDs[1]) {
          return Promise.resolve(executionTarget1);
        }
        return Promise.resolve(executionTarget2);
      });

    // Mock idempotency check to return null (no existing test runs)
    (mockTestRunRepo.findByIdempotencyKey as ReturnType<typeof vi.fn>)
      .mockResolvedValue(null);

    const testRunIDs = await useCase.execute({
      suiteID,
      testCaseIDs,
    });

    // Should create 2 test runs: one for target1 (2 test cases), one for target2 (1 test case)
    expect(testRunIDs).toHaveLength(2);
    expect(mockTestRunRepo.save).toHaveBeenCalledTimes(2);
    expect(mockTriggerPort.trigger).toHaveBeenCalledTimes(2);

    // Verify grouping
    const savedTestRuns = (mockTestRunRepo.save as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[0] as TestRun
    );

    const target1Run = savedTestRuns.find(run => run.executionTarget.id === 'target-1');
    const target2Run = savedTestRuns.find(run => run.executionTarget.id === 'target-2');

    expect(target1Run).toBeDefined();
    expect(target1Run!.testCaseIDs).toHaveLength(2);
    expect(target1Run!.testCaseIDs).toEqual(expect.arrayContaining([testCaseIDs[0], testCaseIDs[1]]));

    expect(target2Run).toBeDefined();
    expect(target2Run!.testCaseIDs).toHaveLength(1);
    expect(target2Run!.testCaseIDs).toContain(testCaseIDs[2]);
  });

  it('should enforce idempotency and return existing test run ID', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID(), createTestCaseID()];
    const executionTarget = createExecutionTargetSnapshot();
    const existingTestRunID = 'existing-run-id';
    const existingTestRun = new TestRun(
      existingTestRunID,
      testCaseIDs,
      suiteID,
      executionTarget
    );

    // Mock resolver to return execution target
    (mockExecutionTargetResolver.resolveExecutionTarget as ReturnType<typeof vi.fn>)
      .mockResolvedValue(executionTarget);

    // Mock idempotency check to return existing test run
    (mockTestRunRepo.findByIdempotencyKey as ReturnType<typeof vi.fn>)
      .mockResolvedValue(existingTestRun);

    const testRunIDs = await useCase.execute({
      suiteID,
      testCaseIDs,
      executionMode: 'MANAGED',
    });

    // Should return existing test run ID, not create a new one
    expect(testRunIDs).toHaveLength(1);
    expect(testRunIDs[0]).toBe(existingTestRunID);
    expect(mockTestRunRepo.save).not.toHaveBeenCalled();
    expect(mockTriggerPort.trigger).not.toHaveBeenCalled();
  });
});

