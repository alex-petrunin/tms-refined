import {TestCaseID} from "../../domain/entities/TestCase";
import {TestRun, TestRunID, TestStatus} from "../../domain/entities/TestRun";
import {TestSuiteID} from "../../domain/entities/TestSuite";
import {ExecutionTriggerPort} from "../ports/ExecutionTriggerPort";
import {TestRunRepository, IdempotencyKey} from "../ports/TestRunRepository";
import {ExecutionTargetResolverPort} from "../ports/ExecutionTargetResolverPort";
import {ExecutionTargetSnapshot} from "../../domain/valueObjects/ExecutionTarget";
import {ExecutionModeType} from "../../domain/valueObjects/ExecutionMode";

export interface RunTestCasesInput {
    suiteID: TestSuiteID;
    testCaseIDs: TestCaseID[];
    executionMode?: ExecutionModeType;
    executionTarget?: ExecutionTargetSnapshot;  // NEW: direct execution target
}

/**
 * Generates a deterministic idempotency key for a test run.
 * The key is based on suiteID, sorted testCaseIDs, executionTarget fingerprint, and executionMode.
 */
function generateIdempotencyKey(
    suiteID: TestSuiteID,
    testCaseIDs: TestCaseID[],
    executionTarget: ExecutionTargetSnapshot,
    executionMode: ExecutionModeType
): IdempotencyKey {
    // Sort testCaseIDs to ensure deterministic ordering
    const sortedTestCaseIDs = [...testCaseIDs].sort().join(",");
    const targetFingerprint = executionTarget.fingerprint();
    return `${suiteID}:${sortedTestCaseIDs}:${targetFingerprint}:${executionMode}`;
}

export class RunTestCasesUseCase {
    constructor(
        private testRunRepo: TestRunRepository,
        private triggerPort: ExecutionTriggerPort,
        private executionTargetResolver: ExecutionTargetResolverPort | null  // null when using direct execution
    ) {}

    async execute(input: RunTestCasesInput): Promise<TestRunID[]> {
        const executionMode = input.executionMode ?? ExecutionModeType.MANAGED;
        
        // Simple path: executionTarget provided directly
        if (input.executionTarget) {
            return await this.executeWithTarget(input, executionMode);
        }
        
        // Complex path: resolve targets per test case
        return await this.executeWithResolver(input, executionMode);
    }

    /**
     * Execute with a single execution target for all test cases
     */
    private async executeWithTarget(
        input: RunTestCasesInput,
        executionMode: ExecutionModeType
    ): Promise<TestRunID[]> {
        const target = input.executionTarget!;
        
        // Generate idempotency key
        const sortedTestCaseIDs = [...input.testCaseIDs].sort().join(",");
        const targetFingerprint = target.fingerprint();
        const idempotencyKey = `${input.suiteID}:${sortedTestCaseIDs}:${targetFingerprint}:${executionMode}`;
        
        // Check for existing test run
        const existingTestRun = await this.testRunRepo.findByIdempotencyKey(idempotencyKey);
        if (existingTestRun && 
            (existingTestRun.status === TestStatus.PENDING || 
             existingTestRun.status === TestStatus.RUNNING)) {
            return [existingTestRun.id];
        }
        
        // Create new test run
        const testRunID = crypto.randomUUID();
        const testRun = new TestRun(
            testRunID,
            input.testCaseIDs,
            input.suiteID,
            target
        );
        
        // Set status based on mode
        if (executionMode === ExecutionModeType.MANAGED) {
            testRun.start();
        } else {
            testRun.markAwaiting();
        }
        
        // Persist
        await this.testRunRepo.save(testRun, idempotencyKey);
        
        // Trigger execution for MANAGED mode
        if (executionMode === ExecutionModeType.MANAGED) {
            await this.triggerPort.trigger(testRun);
        }
        
        return [testRunID];
    }

    /**
     * Execute with per-test-case target resolution
     */
    private async executeWithResolver(
        input: RunTestCasesInput,
        executionMode: ExecutionModeType
    ): Promise<TestRunID[]> {
        if (!this.executionTargetResolver) {
            throw new Error('ExecutionTargetResolver is required when executionTarget is not provided');
        }

        const testRunIDs: TestRunID[] = [];

        // Step 1: Resolve Execution Targets for each TestCaseID
        const testCaseTargetMap = new Map<TestCaseID, ExecutionTargetSnapshot>();
        for (const testCaseID of input.testCaseIDs) {
            const executionTarget = await this.executionTargetResolver.resolveExecutionTarget(testCaseID);
            testCaseTargetMap.set(testCaseID, executionTarget);
        }

        // Step 2: Group Test Cases by Execution Target identity
        const targetGroups = new Map<string, { target: ExecutionTargetSnapshot; testCaseIDs: TestCaseID[] }>();
        
        for (const [testCaseID, executionTarget] of testCaseTargetMap.entries()) {
            const targetKey = executionTarget.fingerprint();
            if (!targetGroups.has(targetKey)) {
                targetGroups.set(targetKey, {
                    target: executionTarget,
                    testCaseIDs: []
                });
            }
            targetGroups.get(targetKey)!.testCaseIDs.push(testCaseID);
        }

        // Step 3: Create Test Runs for each group with idempotency check
        for (const { target, testCaseIDs } of targetGroups.values()) {
            // Generate idempotency key
            const idempotencyKey = generateIdempotencyKey(
                input.suiteID,
                testCaseIDs,
                target,
                executionMode
            );

            // Check if TestRun already exists
            const existingTestRun = await this.testRunRepo.findByIdempotencyKey(idempotencyKey);
            if (existingTestRun) {
                // Only return existing if it's still active
                if (existingTestRun.status === TestStatus.PENDING ||
                    existingTestRun.status === TestStatus.RUNNING) {
                    testRunIDs.push(existingTestRun.id);
                    continue;
                }
            }

            // Create new TestRun
            const testRunID = crypto.randomUUID();
            const testRun = new TestRun(
                testRunID,
                testCaseIDs,
                input.suiteID,
                target
            );

            // Step 4: Handle execution mode
            if (executionMode === ExecutionModeType.MANAGED) {
                // Transition from PENDING → RUNNING
                testRun.start();
            } else {
                // OBSERVED mode: mark as awaiting external results
                testRun.markAwaiting();
            }

            // Step 5: Persist TestRun before triggering execution
            await this.testRunRepo.save(testRun, idempotencyKey);

            // Step 6: Trigger execution for MANAGED mode
            if (executionMode === ExecutionModeType.MANAGED) {
                await this.triggerPort.trigger(testRun);
            }

            testRunIDs.push(testRunID);
        }

        return testRunIDs;
    }
}