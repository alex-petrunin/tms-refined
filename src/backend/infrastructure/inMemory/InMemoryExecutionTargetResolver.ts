import { ExecutionTargetResolverPort } from "../../application/ports/ExecutionTargetResolverPort";
import { TestCaseID } from "../../domain/entities/TestCase";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { TestCaseRepository } from "../../application/ports/TestCaseRepository";

/**
 * In-memory implementation of ExecutionTargetResolverPort.
 * Resolves ExecutionTargetSnapshot from TestCase's executionTargetSnapshot property.
 */
export class InMemoryExecutionTargetResolver implements ExecutionTargetResolverPort {
    constructor(
        private testCaseRepository: TestCaseRepository
    ) {}

    async resolveExecutionTarget(testCaseID: TestCaseID): Promise<ExecutionTargetSnapshot> {
        const testCase = await this.testCaseRepository.findByID(testCaseID);
        
        if (!testCase) {
            throw new Error(`TestCase with ID '${testCaseID}' not found`);
        }

        if (!testCase.executionTargetSnapshot) {
            throw new Error(`TestCase with ID '${testCaseID}' has no ExecutionTargetSnapshot configured`);
        }

        return testCase.executionTargetSnapshot;
    }
}

