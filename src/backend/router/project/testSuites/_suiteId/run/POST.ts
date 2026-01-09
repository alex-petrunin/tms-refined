import { YouTrackIntegrationRepository } from "../../../../../infrastructure/adapters/YouTrackIntegrationRepository";
import { YouTrackTestRunRepository } from "../../../../../infrastructure/adapters/YouTrackTestRunRepository";
import { YouTrackTestRunRepositorySync } from "../../../../../infrastructure/adapters/YouTrackTestRunRepositorySync";
import { CIAdapterFactory } from "../../../../../infrastructure/adapters/CIAdapterFactory";
import { DynamicExecutionTrigger } from "../../../../../infrastructure/adapters/DynamicExecutionTrigger";
import { RunTestCasesUseCase } from "../../../../../application/usecases/RunTestCases";
import { ExecutionTargetSnapshot } from "../../../../../domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "../../../../../domain/enums/ExecutionTargetType";
import { ExecutionModeType } from "../../../../../domain/valueObjects/ExecutionMode";
import { TestRun } from "../../../../../domain/entities/TestRun";

/**
 * @zod-to-schema
 */
export type ExecutionTargetDetails = {
    integrationId: string;
    name: string;
    type: 'GITLAB' | 'GITHUB' | 'MANUAL';
    config: {
        ref?: string;           // GitLab: branch/tag
        workflowFile?: string;  // GitHub: workflow file
    };
};

/**
 * @zod-to-schema
 */
export type RunTestSuiteReq = {
    projectId: string;
    suiteID: string;  // Suite ID - can be from path or body
    testCaseIDs: string[];
    executionMode?: 'MANAGED' | 'OBSERVED';
    executionTarget: ExecutionTargetDetails;
};

/**
 * @zod-to-schema
 */
export type RunTestSuiteRes = {
    testRunIDs: string[];
};

/**
 * POST /project/testSuites/:suiteId/run
 * 
 * Runs test cases using the full DDD flow:
 * RunTestCasesUseCase → DynamicExecutionTrigger → CIAdapterFactory → Provider Adapter → CI API
 * 
 * Note: This handler must stay synchronous for YouTrack compatibility.
 * Async execution happens in background after test run is created.
 */
export default function handle(ctx: CtxPost<RunTestSuiteReq, RunTestSuiteRes>): void {
    console.log('[POST testSuites/run] Handler called');
    
    const body = ctx.request.json() as RunTestSuiteReq;
    
    console.log('[POST testSuites/run] Body parsed:', {
        suiteID: body.suiteID,
        testCaseCount: body.testCaseIDs?.length,
        integrationId: body.executionTarget?.integrationId
    });
    
    // Get suite ID from path or body
    const pathParts = ctx.request.path.split('/');
    const suiteIdIndex = pathParts.indexOf('testSuites') + 1;
    const suiteId = pathParts[suiteIdIndex] || body.suiteID;
    
    const projectKey = ctx.project.shortName || ctx.project.key;

    console.log('[POST testSuites/run] Running tests:', {
        suiteId,
        testCaseCount: body.testCaseIDs.length,
        integrationId: body.executionTarget.integrationId
    });

    try {
        // Build infrastructure
        const integrationRepo = new YouTrackIntegrationRepository();
        
        // Get test runs project from settings, or fallback to current project
        const testRunProjects = ctx.settings.testRunProjects as any;
        let targetProjectKey: string;
        
        if (testRunProjects) {
            targetProjectKey = testRunProjects.shortName || testRunProjects.key || testRunProjects.id;
        } else {
            targetProjectKey = projectKey;
        }
        
        // Use SYNC repository for synchronous YouTrack issue creation
        const testRunRepoSync = new YouTrackTestRunRepositorySync(
            targetProjectKey,
            ctx.currentUser,
            projectKey  // Test case/suite project
        );
        
        // Also create async repository for background operations
        const testRunRepo = new YouTrackTestRunRepository(
            ctx.project,
            ctx.settings,
            undefined,
            ctx.globalStorage
        );
        
        // Create adapter factory and execution trigger
        const adapterFactory = new CIAdapterFactory(
            integrationRepo,
            projectKey,
            testRunRepo
        );
        const executionTrigger = new DynamicExecutionTrigger(adapterFactory);
        
        // Create use case (no resolver needed for direct execution)
        const useCase = new RunTestCasesUseCase(
            testRunRepo,
            executionTrigger,
            null  // executionTargetResolver - not needed when target is provided
        );
        
        // Build ExecutionTargetSnapshot from request
        const executionTarget = new ExecutionTargetSnapshot(
            body.executionTarget.integrationId,
            body.executionTarget.name,
            body.executionTarget.type as ExecutionTargetType,
            body.executionTarget.config
        );
        
        console.log('[POST testSuites/run] Creating test run synchronously...');
        
        // Generate unique ID (YouTrack-compatible, no crypto module)
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const testRunID = `tr_${timestamp}_${random}`;
        
        // Create test run synchronously using the sync repository
        // Use body.suiteID (actual ID) not suiteId from path (which might be "_suiteId" placeholder)
        const testRun = new TestRun(
            testRunID,
            body.testCaseIDs,
            body.suiteID,  // ✅ Use body.suiteID instead of path suiteId
            executionTarget
        );
        
        // Set status based on execution mode
        if (body.executionMode === 'MANAGED') {
            testRun.start();
        } else {
            testRun.markAwaiting();
        }
        
        // Save test run synchronously - creates YouTrack issue
        const createdIssue = testRunRepoSync.save(testRun);
        const actualTestRunID = createdIssue.idReadable || createdIssue.id || testRunID;
        
        console.log('[POST testSuites/run] YouTrack issue created:', {
            tempId: testRunID,
            actualId: actualTestRunID,
            issueId: createdIssue.idReadable
        });
        
        // Trigger execution asynchronously (fire and forget)
        if (body.executionMode === 'MANAGED') {
            console.log('[POST testSuites/run] Triggering execution asynchronously...');
            // Update testRun with actual ID for execution
            testRun.id = actualTestRunID;
            executionTrigger.trigger(testRun).then(() => {
                console.log('[POST testSuites/run] Async execution completed');
            }).catch((error) => {
                console.error('[POST testSuites/run] Async execution failed:', error);
            });
        }
        
        const testRunIDs: string[] = [actualTestRunID];
        
        console.log('[POST testSuites/run] Success:', { testRunIDs });

        ctx.response.json({ testRunIDs });
    } catch (error: any) {
        console.error('[POST testSuites/run] Error:', error);
        ctx.response.code = 500;
        ctx.response.json({ 
            error: error.message || `Failed to run tests: ${error}` 
        } as any);
    }
}

export type Handle = typeof handle;

