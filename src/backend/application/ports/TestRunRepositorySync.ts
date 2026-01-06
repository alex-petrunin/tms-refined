import { TestRun, TestRunID } from "../../domain/entities/TestRun";

/**
 * Synchronous TestRun repository port for YouTrack HTTP handlers.
 * Uses synchronous operations compatible with YouTrack scripting API.
 */
export interface TestRunRepositorySync {
    save(testRun: TestRun): void;
    findById(id: TestRunID): TestRun | null;
    findAll(): TestRun[];
}

