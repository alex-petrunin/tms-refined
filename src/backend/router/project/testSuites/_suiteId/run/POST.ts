import { YouTrackIntegrationRepository } from "../../../../../infrastructure/adapters/YouTrackIntegrationRepository";
import { YouTrackTestRunRepository } from "../../../../../infrastructure/adapters/YouTrackTestRunRepository";
import { CIAdapterFactory } from "../../../../../infrastructure/adapters/CIAdapterFactory";
import { DynamicExecutionTrigger } from "../../../../../infrastructure/adapters/DynamicExecutionTrigger";
import { RunTestCasesUseCase } from "../../../../../application/usecases/RunTestCases";
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
 */
export default async function handle(ctx: CtxPost<RunTestSuiteReq, RunTestSuiteRes>): Promise<void> {
    const body = ctx.request.json() as RunTestSuiteReq;
    
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
        
        // Execute
        const testRunIDs = await useCase.execute({
            suiteID: suiteId,
            testCaseIDs: body.testCaseIDs,
            executionMode: body.executionMode as ExecutionModeType,
            executionTarget: executionTarget
        });

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

