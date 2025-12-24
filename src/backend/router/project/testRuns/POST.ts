import {Project} from "@/api/youtrack-types";
import { RunTestCasesUseCase } from "@/backend/application/usecases/RunTestCases";
import { InMemoryTestRunRepository } from "@/backend/infrastructure/inMemory/InMemoryTestRunRepository";
import { InMemoryTestCaseRepository } from "@/backend/infrastructure/inMemory/InMemoryTestCaseRepository";
import { InMemoryExecutionTargetResolver } from "@/backend/infrastructure/inMemory/InMemoryExecutionTargetResolver";
import { ManualExecutionAdapter } from "@/backend/infrastructure/adapters/ManualExecutionAdapter";
import { ExecutionModeType } from "@/backend/domain/valueObjects/ExecutionMode";

/**
 * @zod-to-schema
 */
export type CreateTestRunReq = {
    suiteID: string;
    testCaseIDs: string[];
    executionMode?: "MANAGED" | "OBSERVED";
};

/**
 * @zod-to-schema
 */
export type CreateTestRunRes = {
    testRunIDs: string[];
};

export default function handle(ctx: CtxPost<CreateTestRunReq, CreateTestRunRes>): void {
    const project = ctx.project as Project;
    const body = ctx.request.json();

    // Validate required fields
    if (!body.suiteID || typeof body.suiteID !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Suite ID is required' } as any);
        return;
    }

    if (!body.testCaseIDs || !Array.isArray(body.testCaseIDs) || body.testCaseIDs.length === 0) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'At least one test case ID is required' } as any);
        return;
    }

    // Validate execution mode if provided
    if (body.executionMode && body.executionMode !== 'MANAGED' && body.executionMode !== 'OBSERVED') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Execution mode must be either MANAGED or OBSERVED' } as any);
        return;
    }

    // Instantiate repositories and adapters
    const testRunRepository = new InMemoryTestRunRepository();
    const testCaseRepository = new InMemoryTestCaseRepository();
    const executionTargetResolver = new InMemoryExecutionTargetResolver(testCaseRepository);
    const executionTrigger = new ManualExecutionAdapter();

    // Instantiate use case
    const runTestCasesUseCase = new RunTestCasesUseCase(
        testRunRepository,
        executionTrigger,
        executionTargetResolver
    );

    // Execute use case
    const executionMode = body.executionMode 
        ? (body.executionMode === 'MANAGED' ? ExecutionModeType.MANAGED : ExecutionModeType.OBSERVED)
        : undefined;

    runTestCasesUseCase.execute({
        suiteID: body.suiteID,
        testCaseIDs: body.testCaseIDs,
        executionMode
    }).then((testRunIDs) => {
        const response: CreateTestRunRes = {
            testRunIDs
        };

        ctx.response.json(response);
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to create test run' } as any);
    });
}

export type Handle = typeof handle;

