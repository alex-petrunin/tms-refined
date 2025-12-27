import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";
import { TestCaseID } from "../../domain/entities/TestCase";
import { TestSuiteRepository } from "../ports/TestSuiteRepository";

export interface UpdateTestSuiteCompositionInput {
    testSuiteID: TestSuiteID;
    testCaseIDs: TestCaseID[];
}

/**
 * Use case for updating test suite composition (which test cases are included).
 * Synchronous - YouTrack scripting environment doesn't support async.
 */
export class UpdateTestSuiteCompositionUseCase {
    constructor(private repo: TestSuiteRepository) {}

    execute(input: UpdateTestSuiteCompositionInput): TestSuite {
        const testSuite = this.repo.findByID(input.testSuiteID);
        if (!testSuite) {
            throw new Error("Test Suite not found");
        }
        
        testSuite.testCaseIDs = input.testCaseIDs;
        this.repo.save(testSuite);
        return testSuite;
    }
}