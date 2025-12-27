import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";
import { TestSuiteRepository } from "../ports/TestSuiteRepository";

export interface CreateTestSuiteInput {
    name: string;
    description?: string;
}

/**
 * Generates a unique ID for test suites.
 * Uses timestamp + random for uniqueness (crypto.randomUUID may not be available in YouTrack).
 */
function generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ts_${timestamp}_${random}`;
}

/**
 * Use case for creating a new test suite.
 * Synchronous - YouTrack scripting environment doesn't support async.
 */
export class CreateTestSuiteUseCase {
    constructor(private repo: TestSuiteRepository) {}

    execute(input: CreateTestSuiteInput): TestSuite {
        const id = generateId();
        const testSuite = new TestSuite(
            id,
            input.name,
            input.description || "",
            []
        );
        this.repo.save(testSuite);
        return testSuite;
    }
}
