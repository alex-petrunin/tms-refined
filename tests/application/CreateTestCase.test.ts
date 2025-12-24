import { describe, it, expect, beforeEach } from 'vitest';
import { CreateTestCaseUseCase } from '@app/usecases/CreateTestCase';
import { InMemoryTestCaseRepository } from '@infra/inMemory/InMemoryTestCaseRepository';
import { createTestCase, createTestCaseID } from '../utils/test-factories';

describe('CreateTestCaseUseCase', () => {
  let useCase: CreateTestCaseUseCase;
  let repository: InMemoryTestCaseRepository;

  beforeEach(() => {
    repository = new InMemoryTestCaseRepository();
    useCase = new CreateTestCaseUseCase(repository);
  });

  it('should create a test case with summary and description', async () => {
    const input = {
      summary: 'Test Case Summary',
      description: 'Test Case Description',
    };

    const testCaseID = await useCase.execute(input);

    expect(testCaseID).toBeDefined();
    expect(typeof testCaseID).toBe('string');

    const saved = await repository.findByID(testCaseID);
    expect(saved).not.toBeNull();
    expect(saved?.summary).toBe(input.summary);
    expect(saved?.description).toBe(input.description);
  });

  it('should create a test case with only summary (optional description)', async () => {
    const input = {
      summary: 'Test Case Summary Only',
    };

    const testCaseID = await useCase.execute(input);

    expect(testCaseID).toBeDefined();

    const saved = await repository.findByID(testCaseID);
    expect(saved).not.toBeNull();
    expect(saved?.summary).toBe(input.summary);
    expect(saved?.description).toBe('');
  });

  it('should generate unique IDs for each test case', async () => {
    const input1 = { summary: 'Test Case 1' };
    const input2 = { summary: 'Test Case 2' };

    const id1 = await useCase.execute(input1);
    const id2 = await useCase.execute(input2);

    expect(id1).not.toBe(id2);
  });

  it('should persist test case in repository', async () => {
    const input = {
      summary: 'Persisted Test Case',
      description: 'This should be saved',
    };

    const testCaseID = await useCase.execute(input);

    // Verify it's persisted by fetching it again
    const fetched = await repository.findByID(testCaseID);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(testCaseID);
    expect(fetched?.summary).toBe(input.summary);
  });
});

