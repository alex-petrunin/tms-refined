import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";

/**
 * Synchronous repository interface for TestSuite.
 * YouTrack's scripting environment is synchronous - no async/await.
 */
export interface TestSuiteRepository {
    save(testSuite: TestSuite): void;
    findByID(id: TestSuiteID): TestSuite | null;
    findAll(): TestSuite[];
    delete(id: TestSuiteID): boolean;
}