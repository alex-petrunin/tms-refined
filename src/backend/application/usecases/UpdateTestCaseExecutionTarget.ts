import { TestCaseID } from "../../domain/entities/TestCase";
import { TestCaseRepository } from "../ports/TestCaseRepository";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";

export interface UpdateTestCaseExecutionTargetInput {
    testCaseID: TestCaseID;
    executionTargetSnapshot: ExecutionTargetSnapshot;
}

/**
 * Use case for updating a TestCase's ExecutionTargetSnapshot.
 * This is a UX concern that allows users to configure execution targets
 * separately from creating test runs.
 */
export class UpdateTestCaseExecutionTargetUseCase {
    constructor(
        private testCaseRepository: TestCaseRepository
    ) {}

    async execute(input: UpdateTestCaseExecutionTargetInput): Promise<void> {
        const testCase = await this.testCaseRepository.findByID(input.testCaseID);
        
        if (!testCase) {
            throw new Error(`TestCase with ID '${input.testCaseID}' not found`);
        }

        // Update the execution target snapshot
        testCase.executionTargetSnapshot = input.executionTargetSnapshot;

        // Persist the updated test case
        await this.testCaseRepository.save(testCase);
    }
}

