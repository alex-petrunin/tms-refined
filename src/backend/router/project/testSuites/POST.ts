import { YouTrackTestSuiteRepository } from "../../../infrastructure/adapters/YouTrackTestSuiteRepository";
import { CreateTestSuiteUseCase } from "../../../application/usecases/CreateTestSuite";

/**
 * @zod-to-schema
 */
export type CreateTestSuiteReq = {
    projectId: string;
    name: string;
    description?: string;
};

/**
 * @zod-to-schema
 */
export type CreateTestSuiteRes = {
    id: string;
    name: string;
    description: string;
    testCaseIDs: string[];
};

export default function handle(ctx: CtxPost<CreateTestSuiteReq, CreateTestSuiteRes>): void {
    const project = ctx.project;
    const body = ctx.request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Name is required' } as any);
        return;
    }

    // Create repository and use case
    const repository = new YouTrackTestSuiteRepository(project);
    const createUseCase = new CreateTestSuiteUseCase(repository);

    try {
        // Execute use case - returns the created test suite
        const testSuite = createUseCase.execute({
            name: body.name,
            description: body.description
        });

        // Return the created test suite
        const response: CreateTestSuiteRes = {
            id: testSuite.id,
            name: testSuite.name,
            description: testSuite.description,
            testCaseIDs: testSuite.testCaseIDs
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to create test suite' } as any);
    }
}

export type Handle = typeof handle;
