import { TestRunRepository } from "../../application/ports/TestRunRepository";
import { TestRun, TestRunID } from "../../domain/entities/TestRun";

export class InMemoryTestRunRepository implements TestRunRepository {
  private store = new Map<TestRunID, TestRun>();

  async save(testRun: TestRun): Promise<void> {
    this.store.set(testRun.id, testRun);
  }

  async findById(id: TestRunID): Promise<TestRun | null> {
    return this.store.get(id) ?? null;
  }
}