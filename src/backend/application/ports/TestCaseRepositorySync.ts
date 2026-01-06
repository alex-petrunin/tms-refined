import { TestCase, TestCaseID } from "../../domain/entities/TestCase";

/**
 * Synchronous TestCase repository port for YouTrack HTTP handlers.
 * Uses synchronous operations compatible with YouTrack scripting API.
 */
export interface TestCaseRepositorySync {
    save(testCase: TestCase): void;
    findByID(id: TestCaseID): TestCase | null;
    findAll(): TestCase[];
}

