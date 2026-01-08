import { ExecutionTargetResolverPort } from "../../application/ports/ExecutionTargetResolverPort";
import { TestCaseID } from "../../domain/entities/TestCase";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { TestCaseRepository } from "../../application/ports/TestCaseRepository";
import { TestSuiteRepository } from "../../application/ports/TestSuiteRepository";
import { IntegrationRepository } from "../../application/ports/IntegrationRepository";
import {
    IntegrationNotFoundError,
    IntegrationDisabledError,
    NoExecutionTargetError
} from "../../application/errors/IntegrationErrors";

/**
 * Resolves execution targets for test cases using a priority cascade
 * 
 * Resolution priority (highest to lowest):
 * 1. Runtime override (explicitly passed)
 * 2. Test case's executionTargetSnapshot
 * 3. Parent suite's defaultExecutionTarget
 * 4. Project default integration
 * 
 * Design:
 * - Separates selection logic from validation
 * - Fail-fast on missing/disabled integrations
 * - No silent fallbacks - explicit configuration required
 */
export class ExecutionTargetResolver implements ExecutionTargetResolverPort {
    constructor(
        private testCaseRepository: TestCaseRepository,
        private testSuiteRepository: TestSuiteRepository,
        private integrationRepository: IntegrationRepository,
        private projectId: string
    ) {}

    /**
     * Resolves the execution target for a given test case
     */
    async resolveExecutionTarget(
        testCaseID: TestCaseID,
        runtimeOverride?: ExecutionTargetSnapshot
    ): Promise<ExecutionTargetSnapshot> {
        // 1. Apply selection logic (priority cascade)
        const target = await this.selectTarget(testCaseID, runtimeOverride);
        
        // 2. Validate target (integration exists, enabled)
        await this.validateTarget(target);
        
        return target;
    }

    /**
     * Selects the appropriate execution target using priority cascade
     * Pure priority logic - easier to test
     */
    private async selectTarget(
        testCaseID: TestCaseID,
        runtimeOverride?: ExecutionTargetSnapshot
    ): Promise<ExecutionTargetSnapshot> {
        // Priority 1: Runtime override
        if (runtimeOverride) {
            return runtimeOverride;
        }
        
        // Priority 2: Test case's executionTargetSnapshot
        const testCase = await this.testCaseRepository.findByID(testCaseID);
        if (testCase?.executionTargetSnapshot) {
            return testCase.executionTargetSnapshot;
        }
        
        // Priority 3: Parent suite's defaultExecutionTarget
        // Use reverse lookup - TestSuite aggregate manages membership
        const parentSuite = this.testSuiteRepository.findByTestCaseId(testCaseID);
        if (parentSuite?.defaultExecutionTarget) {
            return parentSuite.defaultExecutionTarget;
        }
        
        // Priority 4: Project default integration
        // Note: We need to know which provider type to look for
        // For now, we'll try to find any default integration
        // In a real scenario, this might need additional logic or configuration
        const defaultIntegration = await this.findAnyDefaultIntegration();
        if (defaultIntegration) {
            return this.buildDefaultTarget(defaultIntegration);
        }
        
        // No execution target found - fail with clear error
        throw new NoExecutionTargetError(
            `No execution target configured for test case '${testCaseID}'. ` +
            `Configure a target on the test case, suite, or set a project default integration.`
        );
    }

    /**
     * Validates that the target references a valid, enabled integration
     * Fail-fast validation - no silent fallbacks
     */
    private async validateTarget(target: ExecutionTargetSnapshot): Promise<void> {
        const integration = await this.integrationRepository.findById(
            target.integrationId,
            this.projectId
        );
        
        if (!integration) {
            throw new IntegrationNotFoundError(
                `Integration '${target.integrationId}' not found. ` +
                `Cannot execute test. Check integration configuration.`
            );
        }
        
        if (!integration.enabled) {
            throw new IntegrationDisabledError(
                `Integration '${integration.name}' is disabled. ` +
                `Enable it or select a different execution target.`
            );
        }
    }

    /**
     * Finds any default integration (tries each type in order)
     * This is a fallback when no execution target is explicitly configured
     */
    private async findAnyDefaultIntegration() {
        const integration = await this.integrationRepository.findById(this.projectId, this.projectId);
        return integration || null;
    }

    /**
     * Builds a default execution target from an integration
     * Uses sensible defaults based on integration type
     */
    private buildDefaultTarget(integration: any): ExecutionTargetSnapshot {
        // For now, throw an error as we need explicit configuration
        // In the future, this could build a sensible default
        throw new NoExecutionTargetError(
            `Default integration found but no execution target configured. ` +
            `Please configure execution parameters (branch, workflow, etc.) explicitly.`
        );
    }
}

