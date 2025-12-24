import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateTestCaseExecutionTargetUseCase } from '@app/usecases/UpdateTestCaseExecutionTarget';
import { TestCaseRepository } from '@app/ports/TestCaseRepository';
import { TestCase } from '@domain/entities/TestCase';
import {
  createTestCase,
  createTestCaseID,
  createExecutionTargetSnapshot,
} from '../utils/test-factories';
import { createMockRepository } from '../utils/test-helpers';
import { ExecutionTargetType } from '@domain/enums/ExecutionTargetType';

describe('UpdateTestCaseExecutionTargetUseCase', () => {
  let useCase: UpdateTestCaseExecutionTargetUseCase;
  let mockRepository: TestCaseRepository;

  beforeEach(() => {
    mockRepository = createMockRepository<TestCaseRepository>();
    useCase = new UpdateTestCaseExecutionTargetUseCase(mockRepository);
  });

  it('should update execution target snapshot for existing test case', async () => {
    const testCaseID = createTestCaseID();
    const testCase = createTestCase({ id: testCaseID });
    const newExecutionTarget = createExecutionTargetSnapshot({
      id: 'new-target-id',
      name: 'New Execution Target',
      type: ExecutionTargetType.MANUAL,
    });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testCase);

    await useCase.execute({
      testCaseID,
      executionTargetSnapshot: newExecutionTarget,
    });

    expect(testCase.executionTargetSnapshot).toBe(newExecutionTarget);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(testCase);
  });

  it('should replace existing execution target snapshot', async () => {
    const testCaseID = createTestCaseID();
    const oldExecutionTarget = createExecutionTargetSnapshot({
      id: 'old-target-id',
      name: 'Old Execution Target',
    });
    const testCase = createTestCase({ id: testCaseID });
    testCase.executionTargetSnapshot = oldExecutionTarget;

    const newExecutionTarget = createExecutionTargetSnapshot({
      id: 'new-target-id',
      name: 'New Execution Target',
    });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testCase);

    await useCase.execute({
      testCaseID,
      executionTargetSnapshot: newExecutionTarget,
    });

    expect(testCase.executionTargetSnapshot).toBe(newExecutionTarget);
    expect(testCase.executionTargetSnapshot).not.toBe(oldExecutionTarget);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error when test case does not exist', async () => {
    const testCaseID = createTestCaseID();
    const executionTarget = createExecutionTargetSnapshot();

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        testCaseID,
        executionTargetSnapshot: executionTarget,
      })
    ).rejects.toThrow(`TestCase with ID '${testCaseID}' not found`);

    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should fetch test case by correct ID', async () => {
    const testCaseID = createTestCaseID();
    const testCase = createTestCase({ id: testCaseID });
    const executionTarget = createExecutionTargetSnapshot();

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testCase);

    await useCase.execute({
      testCaseID,
      executionTargetSnapshot: executionTarget,
    });

    expect(mockRepository.findByID).toHaveBeenCalledWith(testCaseID);
    expect(mockRepository.findByID).toHaveBeenCalledTimes(1);
  });

  it('should persist updated test case to repository', async () => {
    const testCaseID = createTestCaseID();
    const testCase = createTestCase({ id: testCaseID });
    const executionTarget = createExecutionTargetSnapshot();

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testCase);

    await useCase.execute({
      testCaseID,
      executionTargetSnapshot: executionTarget,
    });

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(testCase);
  });

  it('should handle different execution target types', async () => {
    const testCaseID = createTestCaseID();
    const testCase = createTestCase({ id: testCaseID });
    const manualTarget = createExecutionTargetSnapshot({
      type: ExecutionTargetType.MANUAL,
    });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testCase);

    await useCase.execute({
      testCaseID,
      executionTargetSnapshot: manualTarget,
    });

    expect(testCase.executionTargetSnapshot?.type).toBe(ExecutionTargetType.MANUAL);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});

