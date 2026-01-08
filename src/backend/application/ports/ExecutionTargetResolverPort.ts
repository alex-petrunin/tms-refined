import { TestCaseID } from "../../domain/entities/TestCase";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";

/**
 * Port for resolving ExecutionTargetSnapshot from a TestCaseID.
 * This abstraction allows the application layer to resolve execution targets
 * without depending on infrastructure details.
 * 
 * Resolution priority (highest to lowest):
 * 1. Runtime override (explicitly passed)
 * 2. Test case's executionTargetSnapshot
 * 3. Parent suite's defaultExecutionTarget
 * 4. Project default integration
 */
export interface ExecutionTargetResolverPort {
    /**
     * Resolves the ExecutionTargetSnapshot for a given TestCaseID.
     * @param testCaseID The ID of the test case
     * @param runtimeOverride Optional execution target to use instead of configured defaults
     * @returns The ExecutionTargetSnapshot associated with the test case
     * @throws NoExecutionTargetError if no target can be resolved
     * @throws IntegrationNotFoundError if referenced integration doesn't exist
     * @throws IntegrationDisabledError if referenced integration is disabled
     */
    resolveExecutionTarget(
        testCaseID: TestCaseID,
        runtimeOverride?: ExecutionTargetSnapshot
    ): Promise<ExecutionTargetSnapshot>;
}

