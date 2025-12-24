import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateTestSuiteMetadataUseCase } from '@app/usecases/UpdateTestSuiteMetadata';
import { TestSuiteRepository } from '@app/ports/TestSuiteRepository';
import { TestSuite } from '@domain/entities/TestSuite';
import { createTestSuite, createTestSuiteID } from '../utils/test-factories';
import { createMockRepository } from '../utils/test-helpers';

describe('UpdateTestSuiteMetadataUseCase', () => {
  let useCase: UpdateTestSuiteMetadataUseCase;
  let mockRepository: TestSuiteRepository;

  beforeEach(() => {
    mockRepository = createMockRepository<TestSuiteRepository>();
    useCase = new UpdateTestSuiteMetadataUseCase(mockRepository);
  });

  it('should update name for existing test suite', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({
      id: suiteID,
      name: 'Old Name',
      description: 'Old Description',
    });
    const newName = 'New Name';

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      name: newName,
    });

    expect(testSuite.name).toBe(newName);
    expect(testSuite.description).toBe('Old Description'); // Should remain unchanged
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(testSuite);
  });

  it('should update description for existing test suite', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({
      id: suiteID,
      name: 'Test Suite Name',
      description: 'Old Description',
    });
    const newDescription = 'New Description';

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      description: newDescription,
    });

    expect(testSuite.description).toBe(newDescription);
    expect(testSuite.name).toBe('Test Suite Name'); // Should remain unchanged
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should update both name and description', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({
      id: suiteID,
      name: 'Old Name',
      description: 'Old Description',
    });
    const newName = 'New Name';
    const newDescription = 'New Description';

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      name: newName,
      description: newDescription,
    });

    expect(testSuite.name).toBe(newName);
    expect(testSuite.description).toBe(newDescription);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should preserve existing name when only description is provided', async () => {
    const suiteID = createTestSuiteID();
    const originalName = 'Original Name';
    const testSuite = createTestSuite({
      id: suiteID,
      name: originalName,
      description: 'Old Description',
    });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      description: 'New Description',
    });

    expect(testSuite.name).toBe(originalName);
    expect(testSuite.description).toBe('New Description');
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should preserve existing description when only name is provided', async () => {
    const suiteID = createTestSuiteID();
    const originalDescription = 'Original Description';
    const testSuite = createTestSuite({
      id: suiteID,
      name: 'Old Name',
      description: originalDescription,
    });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      name: 'New Name',
    });

    expect(testSuite.name).toBe('New Name');
    expect(testSuite.description).toBe(originalDescription);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error when test suite does not exist', async () => {
    const suiteID = createTestSuiteID();

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        testSuiteID: suiteID,
        name: 'New Name',
      })
    ).rejects.toThrow('Test Suite not found');

    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should fetch test suite by correct ID', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({ id: suiteID });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      name: 'New Name',
    });

    expect(mockRepository.findByID).toHaveBeenCalledWith(suiteID);
    expect(mockRepository.findByID).toHaveBeenCalledTimes(1);
  });

  it('should persist updated test suite to repository', async () => {
    const suiteID = createTestSuiteID();
    const testSuite = createTestSuite({ id: suiteID });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
      name: 'New Name',
      description: 'New Description',
    });

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(testSuite);
  });

  it('should handle empty input (no updates)', async () => {
    const suiteID = createTestSuiteID();
    const originalName = 'Original Name';
    const originalDescription = 'Original Description';
    const testSuite = createTestSuite({
      id: suiteID,
      name: originalName,
      description: originalDescription,
    });

    (mockRepository.findByID as ReturnType<typeof vi.fn>).mockResolvedValue(testSuite);

    await useCase.execute({
      testSuiteID: suiteID,
    });

    // When name/description are undefined, they should remain unchanged
    expect(testSuite.name).toBe(originalName);
    expect(testSuite.description).toBe(originalDescription);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});

