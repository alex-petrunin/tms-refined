import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";
import { TestSuiteRepository } from "../ports/TestSuiteRepository";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";

export interface UpdateTestSuiteMetadataInput {
    testSuiteID: TestSuiteID;
    name?: string;
    description?: string;
    defaultExecutionTarget?: ExecutionTargetSnapshot | null;
}

/**
 * Use case for updating test suite metadata (name, description).
 * Synchronous - YouTrack scripting environment doesn't support async.
 */
export class UpdateTestSuiteMetadataUseCase {
    constructor(private repo: TestSuiteRepository) {}

    execute(input: UpdateTestSuiteMetadataInput): TestSuite {
        const testSuite = this.repo.findByID(input.testSuiteID);
        if (!testSuite) {
            throw new Error("Test Suite not found");
        }
        
        if (input.name !== undefined) {
            testSuite.name = input.name;
        }
        if (input.description !== undefined) {
            testSuite.description = input.description;
        }
        if (input.defaultExecutionTarget !== undefined) {
            testSuite.defaultExecutionTarget = input.defaultExecutionTarget || undefined;
        }
        
        this.repo.save(testSuite);
        return testSuite;
    }
}