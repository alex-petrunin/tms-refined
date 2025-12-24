import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateTestSuiteCompositionUseCase } from '@app/usecases/UpdateTestSuiteComposition';
import { TestSuiteRepository } from '@app/ports/TestSuiteRepository';
import { TestSuite } from '@domain/entities/TestSuite';
import {
  createTestSuite,
  createTestSuiteID,
  createTestCaseID,
} from '../utils/test-factories';
import { createMockRepository } from '../utils/test-helpers';

describe('UpdateTestSuiteCompositionUseCase', () => {
  let useCase: UpdateTestSuiteCompositionUseCase;
  let mockRepository: TestSuiteRepository;

  beforeEach(() => {
    mockRepository = createMockRepository<TestSuiteRepository>();
    useCase = new UpdateTestSuiteCompositionUseCase(mockRepository);
  });

  it('should update test case IDs for existing test suite', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({ id: suiteID, testCaseIDs: [] });
    const newTestCaseIDs = [createTestCaseID(), createTestCaseID()];

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      testCaseIDs: newTestCaseIDs,
    });

    expect(testSuite.testCaseIDs).toEqual(newTestCaseIDs);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(testSuite);
  });

  it('should replace existing test case IDs', async () => {
    const suiteID = createTestSuiteID();
    const oldTestCaseIDs = [createTestCaseID(), createTestCaseID()];
    const testSuite = createTestSuite({ id: suiteID, testCaseIDs: oldTestCaseIDs });
    const newTestCaseIDs = [createTestCaseID(), createTestCaseID(), createTestCaseID()];

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      testCaseIDs: newTestCaseIDs,
    });

    expect(testSuite.testCaseIDs).toEqual(newTestCaseIDs);
    expect(testSuite.testCaseIDs).not.toEqual(oldTestCaseIDs);
    expect(testSuite.testCaseIDs.length).toBe(3);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should allow empty test case IDs array', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({
      id: suiteID,
      testCaseIDs: [createTestCaseID()],
    });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      testCaseIDs: [],
    });

    expect(testSuite.testCaseIDs).toEqual([]);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error when test suite does not exist', async () => {
    const suiteID = createTestSuiteID();
    const testCaseIDs = [createTestCaseID()];

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        testSuiteID: suiteID,
        testCaseIDs,
      })
    ).rejects.toThrow('Test Suite not found');

    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should fetch test suite by correct ID', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({ id: suiteID });
    const testCaseIDs = [createTestCaseID()];

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      testCaseIDs,
    });

    expect(mockRepository.findByID).toHaveBeenCalledWith(suiteID);
    expect(mockRepository.findByID).toHaveBeenCalledTimes(1);
  });

  it('should persist updated test suite to repository', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({ id: suiteID });
    const testCaseIDs = [createTestCaseID(), createTestCaseID()];

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      testCaseIDs,
    });

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(testSuite);
  });

  it('should handle large number of test case IDs', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({ id: suiteID });
    const testCaseIDs = Array.from({ length: 100 }, () => createTestCaseID());

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      testCaseIDs,
    });

    expect(testSuite.testCaseIDs).toHaveLength(100);
    expect(testSuite.testCaseIDs).toEqual(testCaseIDs);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});

