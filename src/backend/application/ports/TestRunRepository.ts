import { TestRun, TestRunID } from "../../domain/entities/TestRun";

export type IdempotencyKey = string;

export interface TestRunRepository {
  /**
   * Saves a TestRun. Optionally associates it with an idempotency key for duplicate prevention.
   * @param testRun The TestRun to save
   * @param idempotencyKey Optional idempotency key to associate with this TestRun
   */
  save(testRun: TestRun, idempotencyKey?: IdempotencyKey): Promise<void>;
  findById(id: TestRunID): Promise<TestRun | null>;
  /**
   * Finds a TestRun by its idempotency key.
   * Used to prevent duplicate test runs for the same execution context.
   * @param idempotencyKey The deterministic idempotency key
   * @returns The TestRun if found, null otherwise
   */
  findByIdempotencyKey(idempotencyKey: IdempotencyKey): Promise<TestRun | null>;
}
