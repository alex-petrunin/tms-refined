import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateTestSuiteUseCase } from '@app/usecases/CreateTestSuite';
import { TestSuiteRepository } from '@app/ports/TestSuiteRepository';
import { createTestSuite, createTestSuiteID } from '../utils/test-factories';
import { createMockRepository } from '../utils/test-helpers';

describe('CreateTestSuiteUseCase', () => {
  let useCase: CreateTestSuiteUseCase;
  let mockRepository: TestSuiteRepository;

  beforeEach(() => {
    mockRepository = createMockRepository<TestSuiteRepository>();
    useCase = new CreateTestSuiteUseCase(mockRepository);
  });

  it('should create a test suite with name and description', async () => {
    const input = {
      name: 'Test Suite Name',
      description: 'Test Suite Description',
    };

    const suiteID = await useCase.execute(input);

    expect(suiteID).toBeDefined();
    expect(typeof suiteID).toBe('string');

    // Verify repository was called with correct test suite
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedSuite = (mockRepository.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedSuite.name).toBe(input.name);
    expect(savedSuite.description).toBe(input.description);
    expect(savedSuite.testCaseIDs).toEqual([]);
    expect(savedSuite.id).toBe(suiteID);
  });

  it('should create a test suite with only name (optional description)', async () => {
    const input = {
      name: 'Test Suite Name Only',
    };

    const suiteID = await useCase.execute(input);

    expect(suiteID).toBeDefined();

    const savedSuite = (mockRepository.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedSuite.name).toBe(input.name);
    expect(savedSuite.description).toBe('');
    expect(savedSuite.testCaseIDs).toEqual([]);
  });

  it('should generate unique IDs for each test suite', async () => {
    const input1 = { name: 'Test Suite 1' };
    const input2 = { name: 'Test Suite 2' };

    const id1 = await useCase.execute(input1);
    const id2 = await useCase.execute(input2);

    expect(id1).not.toBe(id2);
  });

  it('should persist test suite in repository', async () => {
    const input = {
      name: 'Persisted Test Suite',
      description: 'This should be saved',
    };

    const suiteID = await useCase.execute(input);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedSuite = (mockRepository.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedSuite.id).toBe(suiteID);
    expect(savedSuite.name).toBe(input.name);
    expect(savedSuite.description).toBe(input.description);
  });

  it('should initialize test suite with empty test case IDs array', async () => {
    const input = {
      name: 'Empty Test Suite',
    };

    await useCase.execute(input);

    const savedSuite = (mockRepository.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedSuite.testCaseIDs).toEqual([]);
    expect(Array.isArray(savedSuite.testCaseIDs)).toBe(true);
  });
});

