import { TestCaseID } from "../../domain/entities/TestCase";
import { TestRun, TestRunID } from "../../domain/entities/TestRun";
import { TestSuiteID } from "../../domain/entities/TestSuite";
import { ExecutionTriggerPort } from "../ports/ExecutionTriggerPort";
import { TestRunRepositorySync } from "../ports/TestRunRepositorySync";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { ExecutionModeType } from "../../domain/valueObjects/ExecutionMode";

export interface RunTestCasesSyncInput {
    suiteID: TestSuiteID;
    testCaseIDs: TestCaseID[];
    executionMode?: ExecutionModeType;
    executionTarget: ExecutionTargetSnapshot;
}

/**
 * Synchronous use case for running test cases.
 * Designed for YouTrack HTTP handlers where operations must be synchronous.
 * 
 * Creates test run synchronously, triggers execution asynchronously (fire and forget).
 */
export class RunTestCasesSyncUseCase {
    constructor(
        private testRunRepoSync: TestRunRepositorySync,
        private triggerPort: ExecutionTriggerPort
    ) {}

    execute(input: RunTestCasesSyncInput): TestRunID {
        const executionMode = input.executionMode ?? ExecutionModeType.MANAGED;
        
        // Generate unique ID (YouTrack-compatible, no crypto module)
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const testRunID = `tr_${timestamp}_${random}`;
        
        // Create test run domain entity
        const testRun = new TestRun(
            testRunID,
            input.testCaseIDs,
            input.suiteID,
            input.executionTarget
        );
        
        // Set status based on execution mode
        if (executionMode === ExecutionModeType.MANAGED) {
            testRun.start();  // PENDING → RUNNING
        } else {
            testRun.markAwaiting();  // PENDING → AWAITING_EXTERNAL_RESULTS
        }
        
        // Save test run synchronously - creates YouTrack issue
        const createdIssue = this.testRunRepoSync.save(testRun);
        const actualTestRunID = createdIssue.idReadable || createdIssue.id || testRunID;
        
        console.log('[RunTestCasesSyncUseCase] Test run created:', {
            tempId: testRunID,
            actualId: actualTestRunID,
            issueId: createdIssue.idReadable
        });
        
        // Trigger execution asynchronously (fire and forget) for MANAGED mode
        if (executionMode === ExecutionModeType.MANAGED) {
            console.log('[RunTestCasesSyncUseCase] Triggering execution asynchronously...');
            
            // Update testRun with actual ID for execution
            testRun.id = actualTestRunID;
            
            this.triggerPort.trigger(testRun).then(() => {
                console.log('[RunTestCasesSyncUseCase] Async execution completed');
            }).catch((error) => {
                console.error('[RunTestCasesSyncUseCase] Async execution failed:', error);
            });
        }
        
        // Return actual YouTrack issue ID immediately
        return actualTestRunID;
    }
}

