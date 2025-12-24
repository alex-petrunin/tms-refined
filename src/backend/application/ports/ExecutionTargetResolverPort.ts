import { TestCaseID } from "../../domain/entities/TestCase";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";

/**
 * Port for resolving ExecutionTargetSnapshot from a TestCaseID.
 * This abstraction allows the application layer to resolve execution targets
 * without depending on infrastructure details.
 */
export interface ExecutionTargetResolverPort {
    /**
     * Resolves the ExecutionTargetSnapshot for a given TestCaseID.
     * @param testCaseID The ID of the test case
     * @returns The ExecutionTargetSnapshot associated with the test case
     * @throws Error if the test case is not found or has no execution target
     */
    resolveExecutionTarget(testCaseID: TestCaseID): Promise<ExecutionTargetSnapshot>;
}

