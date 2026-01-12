import { YouTrackIntegrationRepository } from "../../../../../infrastructure/adapters/YouTrackIntegrationRepository";
import { YouTrackTestRunRepository } from "../../../../../infrastructure/adapters/YouTrackTestRunRepository";
import { YouTrackTestRunRepositorySync } from "../../../../../infrastructure/adapters/YouTrackTestRunRepositorySync";
import { YouTrackTestCaseRepositorySync } from "../../../../../infrastructure/adapters/YouTrackTestCaseRepositorySync";
import { CIAdapterFactory } from "../../../../../infrastructure/adapters/CIAdapterFactory";
import { DynamicExecutionTrigger } from "../../../../../infrastructure/adapters/DynamicExecutionTrigger";
import { ExecutionModeType } from "../../../../../domain/valueObjects/ExecutionMode";
import { TestRun, TestStatus } from "../../../../../domain/entities/TestRun";

/**
 * @zod-to-schema
 */
export type RunTestSuiteReq = {
    projectId: string;
    suiteID: string;  // Suite ID - can be from path or body
    testCaseIDs: string[];
    executionMode?: 'MANAGED' | 'OBSERVED';
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
 * Runs test cases by reading their execution targets and grouping automatically.
 * Creates one TestRun per unique execution target.
 * 
 * Note: This handler must stay synchronous for YouTrack compatibility.
 * Async execution happens in background after test runs are created.
 */
export default function handle(ctx: CtxPost<RunTestSuiteReq, RunTestSuiteRes>): void {
    console.log('[POST testSuites/run] Handler called');
    
    const body = ctx.request.json() as RunTestSuiteReq;
    const projectKey = ctx.project.shortName || ctx.project.key;
    
    console.log('[POST testSuites/run] Body parsed:', {
        suiteID: body.suiteID,
        testCaseCount: body.testCaseIDs?.length
    });

    try {
        // Load test cases to read their execution targets
        const testCaseRepo = new YouTrackTestCaseRepositorySync(projectKey, ctx.currentUser);
        const testCases = body.testCaseIDs.map(id => testCaseRepo.findByID(id)).filter(tc => tc !== null);
        
        console.log('[POST testSuites/run] Loaded test cases:', testCases.length);
        
        // Group test cases by execution target fingerprint
        // Skip test cases without execution targets
        const groupedByTarget = new Map<string, {target: any, caseIds: string[]}>();
        const skippedCases: string[] = [];
        
        for (const testCase of testCases) {
            const target = testCase.executionTargetSnapshot;
            
            // Skip test cases without execution targets
            if (!target) {
                skippedCases.push(testCase.id);
                console.log('[POST testSuites/run] Skipping test case without execution target:', testCase.id);
                continue;
            }
            
            const fingerprint = target.fingerprint();
            
            if (!groupedByTarget.has(fingerprint)) {
                groupedByTarget.set(fingerprint, {
                    target: target,
                    caseIds: []
                });
            }
            groupedByTarget.get(fingerprint)!.caseIds.push(testCase.id);
        }
        
        console.log('[POST testSuites/run] Grouped into', groupedByTarget.size, 'target(s)');
        if (skippedCases.length > 0) {
            console.log('[POST testSuites/run] Skipped', skippedCases.length, 'test cases without execution targets:', skippedCases);
        }
        
        // Check if there are any valid test cases to run
        if (groupedByTarget.size === 0) {
            const errorMsg = skippedCases.length > 0 
                ? `Cannot run tests: All ${skippedCases.length} test case(s) are missing execution targets. Please configure execution targets for your test cases.`
                : 'Cannot run tests: No test cases found.';
            console.error('[POST testSuites/run]', errorMsg);
            ctx.response.code = 400;
            ctx.response.json({ error: errorMsg } as any);
            return;
        }
        
        // Build infrastructure
        const integrationRepo = new YouTrackIntegrationRepository();
        const testRunProjects = ctx.settings.testRunProjects as any;
        const targetProjectKey = testRunProjects 
            ? (testRunProjects.shortName || testRunProjects.key || testRunProjects.id)
            : projectKey;
        
        const testRunRepoSync = new YouTrackTestRunRepositorySync(
            targetProjectKey,
            ctx.currentUser,
            projectKey
        );
        
        const testRunRepo = new YouTrackTestRunRepository(
            ctx.project,
            ctx.settings,
            undefined,
            ctx.globalStorage
        );
        
        const adapterFactory = new CIAdapterFactory(
            integrationRepo,
            projectKey,
            testRunRepo
        );
        const executionTrigger = new DynamicExecutionTrigger(adapterFactory);
        
        // Create one TestRun per group
        const testRunIDs: string[] = [];
        const executionMode = body.executionMode || ExecutionModeType.MANAGED;
        
        for (const [fingerprint, group] of groupedByTarget.entries()) {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 8);
            const testRunID = `tr_${timestamp}_${random}`;
            
            // Create TestRun entity
            const testRun = new TestRun(
                testRunID,
                group.caseIds,
                body.suiteID,
                group.target
            );
            
            // Set status based on execution mode
            if (executionMode === ExecutionModeType.MANAGED) {
                testRun.start();
            } else {
                testRun.markAwaiting();
            }
            
            // Save synchronously
            const createdIssue = testRunRepoSync.save(testRun);
            const actualTestRunID = createdIssue.idReadable || createdIssue.id || testRunID;
            testRunIDs.push(actualTestRunID);
            
            console.log('[POST testSuites/run] Created test run:', actualTestRunID, 'for', group.caseIds.length, 'cases');
            
            // Trigger execution asynchronously for MANAGED mode
            if (executionMode === ExecutionModeType.MANAGED && group.target) {
                testRun.id = actualTestRunID;
                executionTrigger.trigger(testRun).then(() => {
                    console.log('[POST testSuites/run] Async execution completed for', actualTestRunID);
                }).catch((error) => {
                    console.error('[POST testSuites/run] Async execution failed for', actualTestRunID, ':', error);
                });
            }
        }
        
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

