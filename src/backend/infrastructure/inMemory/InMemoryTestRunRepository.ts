import { TestRunRepository, IdempotencyKey } from "../../application/ports/TestRunRepository";
import { TestRun, TestRunID } from "../../domain/entities/TestRun";

export class InMemoryTestRunRepository implements TestRunRepository {
  private store = new Map<TestRunID, TestRun>();
  private idempotencyKeyIndex = new Map<IdempotencyKey, TestRunID>();
  private pipelineIdIndex = new Map<string, TestRunID>();

  async save(testRun: TestRun, idempotencyKey?: IdempotencyKey): Promise<void> {
    this.store.set(testRun.id, testRun);
    if (idempotencyKey) {
      this.idempotencyKeyIndex.set(idempotencyKey, testRun.id);
    }
  }

  async findById(id: TestRunID): Promise<TestRun | null> {
    return this.store.get(id) ?? null;
  }

  async findByIdempotencyKey(idempotencyKey: IdempotencyKey): Promise<TestRun | null> {
    const testRunID = this.idempotencyKeyIndex.get(idempotencyKey);
    if (!testRunID) {
      return null;
    }
    return this.findById(testRunID);
  }

  async associatePipelineId(testRunID: TestRunID, pipelineId: string): Promise<void> {
    this.pipelineIdIndex.set(pipelineId, testRunID);
  }

  async findByPipelineId(pipelineId: string): Promise<TestRun | null> {
    const testRunID = this.pipelineIdIndex.get(pipelineId);
    if (!testRunID) {
      return null;
    }
    return this.findById(testRunID);
  }
}