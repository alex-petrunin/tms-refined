import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";
import { TestCaseID } from "../../domain/entities/TestCase";

/**
 * Synchronous repository interface for TestSuite.
 * YouTrack's scripting environment is synchronous - no async/await.
 */
export interface TestSuiteRepository {
    save(testSuite: TestSuite): void;
    findByID(id: TestSuiteID): TestSuite | null;
    findAll(): TestSuite[];
    delete(id: TestSuiteID): boolean;
    
    /**
     * Finds the test suite that contains the given test case ID.
     * Uses reverse lookup through suite composition.
     * @param testCaseId The test case ID to search for
     * @returns The test suite containing the test case, or null if not found
     */
    findByTestCaseId(testCaseId: TestCaseID): TestSuite | null;
}