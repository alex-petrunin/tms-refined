import { Project } from "@/api/youtrack-types";
import { HandleExecutionResultUseCase } from "../../../../application/usecases/HandleExecutionResult";
import { YouTrackTestRunRepository } from "../../../../infrastructure/adapters/YouTrackTestRunRepository";

/**
 * @zod-to-schema
 */
export type TestRunResultReq = {
    testRunID: string;
    passed: boolean;
};

/**
 * @zod-to-schema
 */
export type TestRunResultRes = {
    success: boolean;
    message?: string;
};

/**
 * Handle test run execution results.
 * Uses DDD approach with HandleExecutionResultUseCase and YouTrackTestRunRepository.
 */
export default function handle(ctx: CtxPost<TestRunResultReq, TestRunResultRes>): void {
    const body = ctx.request.json();

    // Validate required fields
    if (!body.testRunID || typeof body.testRunID !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ 
            success: false,
            message: 'Test run ID is required' 
        } as any);
        return;
    }

    if (typeof body.passed !== 'boolean') {
        ctx.response.code = 400;
        ctx.response.json({ 
            success: false,
            message: 'Passed field must be a boolean' 
        } as any);
        return;
    }

    try {
        // Initialize repository with YouTrack context
        const repository = new YouTrackTestRunRepository(
            ctx.project as Project,
            ctx.settings,
            undefined, // appHost not available in HTTP handlers
            undefined  // globalStorage not available in HTTP handlers
        );

        // Initialize and execute use case
        const useCase = new HandleExecutionResultUseCase(repository);

        // Execute use case (async)
        useCase.execute({
            testRunID: body.testRunID,
            passed: body.passed
        }).then(() => {
            const response: TestRunResultRes = {
                success: true,
                message: 'Test run result processed successfully'
            };
            ctx.response.json(response);
        }).catch((error: any) => {
            ctx.response.code = 500;
            ctx.response.json({ 
                success: false,
                message: error.message || 'Failed to process test run result' 
            } as any);
        });
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ 
            success: false,
            message: error.message || 'Failed to initialize test run handler' 
        } as any);
    }
}

export type Handle = typeof handle;

