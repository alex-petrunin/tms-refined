import { TestRun, TestRunID } from "../../domain/entities/TestRun";

export interface TestRunRepository {
  save(testRun: TestRun): Promise<void>;
  findById(id: TestRunID): Promise<TestRun | null>;
}
