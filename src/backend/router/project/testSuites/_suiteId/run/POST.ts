import { YouTrackIntegrationRepository } from "../../../../../infrastructure/adapters/YouTrackIntegrationRepository";
import { YouTrackTestRunRepository } from "../../../../../infrastructure/adapters/YouTrackTestRunRepository";
import { YouTrackTestRunRepositorySync } from "../../../../../infrastructure/adapters/YouTrackTestRunRepositorySync";
import { CIAdapterFactory } from "../../../../../infrastructure/adapters/CIAdapterFactory";
import { DynamicExecutionTrigger } from "../../../../../infrastructure/adapters/DynamicExecutionTrigger";
import { RunTestCasesSyncUseCase } from "../../../../../application/usecases/RunTestCasesSync";
import { ExecutionTargetSnapshot } from "../../../../../domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "../../../../../domain/enums/ExecutionTargetType";
import { ExecutionModeType } from "../../../../../domain/valueObjects/ExecutionMode";

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
        // Build infrastructure layer (DDD: Infrastructure adapters)
        const integrationRepo = new YouTrackIntegrationRepository();
        
        // Get test runs project from settings, or fallback to current project
        const testRunProjects = ctx.settings.testRunProjects as any;
        let targetProjectKey: string;
        
        if (testRunProjects) {
            targetProjectKey = testRunProjects.shortName || testRunProjects.key || testRunProjects.id;
        } else {
            targetProjectKey = projectKey;
        }
        
        // Synchronous repository for YouTrack issue creation
        const testRunRepoSync = new YouTrackTestRunRepositorySync(
            targetProjectKey,
            ctx.currentUser,
            projectKey  // Test case/suite project
        );
        
        // Async repository for background operations
        const testRunRepo = new YouTrackTestRunRepository(
            ctx.project,
            ctx.settings,
            undefined,
            ctx.globalStorage
        );
        
        // Execution trigger port (DDD: Application port)
        const adapterFactory = new CIAdapterFactory(
            integrationRepo,
            projectKey,
            testRunRepo
        );
        const executionTrigger = new DynamicExecutionTrigger(adapterFactory);
        
        // Build domain value object (DDD: Domain layer)
        const executionTarget = new ExecutionTargetSnapshot(
            body.executionTarget.integrationId,
            body.executionTarget.name,
            body.executionTarget.type as ExecutionTargetType,
            body.executionTarget.config
        );
        
        // Create and execute use case (DDD: Application layer)
        const useCase = new RunTestCasesSyncUseCase(
            testRunRepoSync,
            executionTrigger
        );
        
        console.log('[POST testSuites/run] Executing use case...');
        
        const actualTestRunID = useCase.execute({
            suiteID: body.suiteID,
            testCaseIDs: body.testCaseIDs,
            executionMode: body.executionMode as ExecutionModeType,
            executionTarget: executionTarget
        });
        
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

