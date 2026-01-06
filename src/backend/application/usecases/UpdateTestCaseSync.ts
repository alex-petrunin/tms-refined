import { TestCaseRepositorySync } from "../ports/TestCaseRepositorySync";
import { TestCase, TestCaseID } from "../../domain/entities/TestCase";

export interface UpdateTestCaseInput {
    testCaseID: TestCaseID;
    summary?: string;
    description?: string;
}

/**
 * Synchronous use case for updating a test case.
 * Designed for YouTrack HTTP handlers where operations must be synchronous.
 */
export class UpdateTestCaseSyncUseCase {
    constructor(private repo: TestCaseRepositorySync) {}

    execute(input: UpdateTestCaseInput): TestCase {
        const testCase = this.repo.findByID(input.testCaseID);
        if (!testCase) {
            throw new Error("Test Case not found");
        }
        
        if (input.summary !== undefined) {
            testCase.summary = input.summary;
        }
        if (input.description !== undefined) {
            testCase.description = input.description;
        }
        
        this.repo.save(testCase);
        return testCase;
    }
}

