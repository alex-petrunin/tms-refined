import { TestRunRepositorySync } from "../ports/TestRunRepositorySync";
import { TestRun, TestRunID } from "../../domain/entities/TestRun";
import { TestCaseID } from "../../domain/entities/TestCase";
import { TestSuiteID } from "../../domain/entities/TestSuite";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

export interface CreateTestRunInput {
    suiteID: TestSuiteID;
    testCaseIDs: TestCaseID[];
    executionMode?: "MANAGED" | "OBSERVED";
    executionTarget?: {
        id?: string;
        name?: string;
        type?: "GITLAB" | "GITHUB" | "MANUAL";
        ref?: string;
    };
}

/**
 * Synchronous use case for creating a new test run.
 * Designed for YouTrack HTTP handlers where operations must be synchronous.
 */
export class CreateTestRunSyncUseCase {
    constructor(private repo: TestRunRepositorySync) {}

    execute(input: CreateTestRunInput): TestRunID {
        // Generate unique ID
        const testRunId = this.generateId();
        
        // Build execution target
        const executionTarget = new ExecutionTargetSnapshot(
            input.executionTarget?.id || this.generateId(),
            input.executionTarget?.name || 'Manual Execution',
            this.mapExecutionTargetType(input.executionTarget?.type || 'MANUAL'),
            input.executionTarget?.ref || ''
        );
        
        // Create test run
        const testRun = new TestRun(
            testRunId,
            input.testCaseIDs,
            input.suiteID,
            executionTarget
        );
        
        // Handle execution mode
        if (input.executionMode === 'OBSERVED') {
            testRun.markAwaiting();
        }
        // For MANAGED mode, keep it in PENDING status
        // The actual execution trigger would be handled by the handler
        
        // Save test run
        const issue = this.repo.save(testRun);
        
        // Return the actual YouTrack issue ID (e.g., "TEST-123")
        return issue.idReadable || issue.id || testRunId;
    }

    private generateId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `tr_${timestamp}_${random}`;
    }

    private mapExecutionTargetType(type: string): ExecutionTargetType {
        switch (type) {
            case 'GITLAB':
                return ExecutionTargetType.GITLAB;
            case 'GITHUB':
                return ExecutionTargetType.GITHUB;
            case 'MANUAL':
                return ExecutionTargetType.MANUAL;
            default:
                return ExecutionTargetType.MANUAL;
        }
    }
}

