import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HandleExecutionResultUseCase } from '@app/usecases/HandleExecutionResult';
import { TestRunRepository } from '@app/ports/TestRunRepository';
import { TestRun, TestStatus } from '@domain/entities/TestRun';
import { createTestRun, createTestRunID } from '../utils/test-factories';
import { createMockRepository } from '../utils/test-helpers';

describe('HandleExecutionResultUseCase', () => {
  let useCase: HandleExecutionResultUseCase;
  let mockRepository: TestRunRepository;

  beforeEach(() => {
    mockRepository = createMockRepository<TestRunRepository>();
    useCase = new HandleExecutionResultUseCase(mockRepository);
  });

  it('should complete a running test run with passed result', async () => {
    const testRunID = createTestRunID();
    const testRun = createTestRun({ id: testRunID });
    testRun.status = TestStatus.RUNNING;

    (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(testRun);

    await useCase.execute({
      testRunID,
      passed: true,
    });

    expect(testRun.status).toBe(TestStatus.PASSED);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(testRun);
  });

  it('should complete a running test run with failed result', async () => {
    const testRunID = createTestRunID();
    const testRun = createTestRun({ id: testRunID });
    testRun.status = TestStatus.RUNNING;

    (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(testRun);

    await useCase.execute({
      testRunID,
      passed: false,
    });

    expect(testRun.status).toBe(TestStatus.FAILED);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(testRun);
  });

  it('should complete an awaiting external results test run with passed result', async () => {
    const testRunID = createTestRunID();
    const testRun = createTestRun({ id: testRunID });
    testRun.status = TestStatus.AWAITING_EXTERNAL_RESULTS;

    (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(testRun);

    await useCase.execute({
      testRunID,
      passed: true,
    });

    expect(testRun.status).toBe(TestStatus.PASSED);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should complete an awaiting external results test run with failed result', async () => {
    const testRunID = createTestRunID();
    const testRun = createTestRun({ id: testRunID });
    testRun.status = TestStatus.AWAITING_EXTERNAL_RESULTS;

    (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(testRun);

    await useCase.execute({
      testRunID,
      passed: false,
    });

    expect(testRun.status).toBe(TestStatus.FAILED);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should not update status if test run is already completed (PASSED)', async () => {
    const testRunID = createTestRunID();
    const testRun = createTestRun({ id: testRunID });
    testRun.status = TestStatus.PASSED;

    (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(testRun);

    await useCase.execute({
      testRunID,
      passed: false,
    });

    // Status should remain PASSED (complete method returns early for non-running/awaiting statuses)
    expect(testRun.status).toBe(TestStatus.PASSED);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should not update status if test run is already completed (FAILED)', async () => {
    const testRunID = createTestRunID();
    const testRun = createTestRun({ id: testRunID });
    testRun.status = TestStatus.FAILED;

    (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(testRun);

    await useCase.execute({
      testRunID,
      passed: true,
    });

    // Status should remain FAILED
    expect(testRun.status).toBe(TestStatus.FAILED);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should handle non-existent test run gracefully', async () => {
    const testRunID = createTestRunID();

    (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await useCase.execute({
      testRunID,
      passed: true,
    });

    // Should not throw and should not save anything
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should fetch test run by correct ID', async () => {
    const testRunID = createTestRunID();
    const testRun = createTestRun({ id: testRunID });
    testRun.status = TestStatus.RUNNING;

    (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(testRun);

    await useCase.execute({
      testRunID,
      passed: true,
    });

    expect(mockRepository.findById).toHaveBeenCalledWith(testRunID);
    expect(mockRepository.findById).toHaveBeenCalledTimes(1);
  });
});

