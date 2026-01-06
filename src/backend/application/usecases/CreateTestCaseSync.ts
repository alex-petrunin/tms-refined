import { TestCaseRepositorySync } from "../ports/TestCaseRepositorySync";
import { TestCase, TestCaseID } from "../../domain/entities/TestCase";

export interface CreateTestCaseInput {
    summary: string;
    description?: string;
}

/**
 * Synchronous use case for creating a new test case.
 * Designed for YouTrack HTTP handlers where operations must be synchronous.
 */
export class CreateTestCaseSyncUseCase {
    constructor(private repo: TestCaseRepositorySync) {}

    execute(input: CreateTestCaseInput): TestCaseID {
        // Create a temporary test case with a placeholder ID
        // The repository will replace this with the actual issue ID
        const tempId = this.generateId();
        const testCase = new TestCase(
            tempId,
            input.summary,
            input.description || ""
        );
        const issue = this.repo.save(testCase);
        
        // Return the actual YouTrack issue ID (e.g., "TEST-123")
        return issue.idReadable || issue.id || tempId;
    }

    private generateId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `tc_${timestamp}_${random}`;
    }
}

