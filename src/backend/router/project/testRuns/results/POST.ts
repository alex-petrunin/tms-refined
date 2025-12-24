import {Project} from "@/api/youtrack-types";
import { HandleExecutionResultUseCase } from "@/backend/application/usecases/HandleExecutionResult";
import { InMemoryTestRunRepository } from "@/backend/infrastructure/inMemory/InMemoryTestRunRepository";

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

export default function handle(ctx: CtxPost<TestRunResultReq, TestRunResultRes>): void {
    const project = ctx.project as Project;
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

    // Instantiate repository and use case
    const repository = new InMemoryTestRunRepository();
    const handleExecutionResultUseCase = new HandleExecutionResultUseCase(repository);

    // Execute use case
    handleExecutionResultUseCase.execute({
        testRunID: body.testRunID,
        passed: body.passed
    }).then(() => {
        const response: TestRunResultRes = {
            success: true,
            message: 'Test run result processed successfully'
        };

        ctx.response.json(response);
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ 
            success: false,
            message: error.message || 'Failed to process test run result' 
        } as any);
    });
}

export type Handle = typeof handle;

