import {Project} from "@/api/youtrack-types";
import { CreateTestCaseUseCase } from "@/backend/application/usecases/CreateTestCase";
import { InMemoryTestCaseRepository } from "@/backend/infrastructure/inMemory/InMemoryTestCaseRepository";

/**
 * @zod-to-schema
 */
export type CreateTestCaseReq = {
    summary: string;
    description?: string;
};

/**
 * @zod-to-schema
 */
export type CreateTestCaseRes = {
    id: string;
    summary: string;
    description: string;
    executionTargetSnapshot?: {
        id: string;
        name: string;
        type: string;
        ref: string;
    };
};

export default function handle(ctx: CtxPost<CreateTestCaseReq, CreateTestCaseRes>): void {
    const project = ctx.project as Project;
    const body = ctx.request.json();

    // Validate required fields
    if (!body.summary || typeof body.summary !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Summary is required' } as any);
        return;
    }

    // Instantiate repository and use case
    const repository = new InMemoryTestCaseRepository();
    const createTestCaseUseCase = new CreateTestCaseUseCase(repository);

    // Execute use case
    createTestCaseUseCase.execute({
        summary: body.summary,
        description: body.description
    }).then((testCaseId) => {
        // Retrieve the created test case to return full details
        return repository.findByID(testCaseId).then((testCase) => {
            if (!testCase) {
                ctx.response.code = 500;
                ctx.response.json({ error: 'Failed to retrieve created test case' } as any);
                return;
            }

            const response: CreateTestCaseRes = {
                id: testCase.id,
                summary: testCase.summary,
                description: testCase.description,
                executionTargetSnapshot: testCase.executionTargetSnapshot ? {
                    id: testCase.executionTargetSnapshot.id,
                    name: testCase.executionTargetSnapshot.name,
                    type: testCase.executionTargetSnapshot.type,
                    ref: testCase.executionTargetSnapshot.ref
                } : undefined
            };

            ctx.response.json(response);
        });
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to create test case' } as any);
    });
}

export type Handle = typeof handle;

