import { YouTrackTestSuiteRepository } from "../../../infrastructure/adapters/YouTrackTestSuiteRepository";
import { UpdateTestSuiteMetadataUseCase } from "../../../application/usecases/UpdateTestSuiteMetadata";
import { UpdateTestSuiteCompositionUseCase } from "../../../application/usecases/UpdateTestSuiteComposition";

/**
 * @zod-to-schema
 */
export type UpdateTestSuiteReq = {
    id: string;
    name?: string;
    description?: string;
    testCaseIDs?: string[];
};

/**
 * @zod-to-schema
 */
export type UpdateTestSuiteRes = {
    id: string;
    name: string;
    description: string;
    testCaseIDs: string[];
};

export default function handle(ctx: CtxPut<UpdateTestSuiteReq, UpdateTestSuiteRes>): void {
    const project = ctx.project;
    const body = ctx.request.json();

    // Get test suite ID from request body
    const testSuiteId = body.id;

    if (!testSuiteId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test suite ID is required' } as any);
        return;
    }

    // Create repository
    const repository = new YouTrackTestSuiteRepository(project);

    try {
        let testSuite = repository.findByID(testSuiteId);
        
        if (!testSuite) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Test suite not found' } as any);
            return;
        }

        // Update metadata if provided
        if (body.name !== undefined || body.description !== undefined) {
            const updateMetadataUseCase = new UpdateTestSuiteMetadataUseCase(repository);
            testSuite = updateMetadataUseCase.execute({
                testSuiteID: testSuiteId,
                name: body.name,
                description: body.description
            });
        }

        // Update composition if provided
        if (body.testCaseIDs !== undefined) {
            const updateCompositionUseCase = new UpdateTestSuiteCompositionUseCase(repository);
            testSuite = updateCompositionUseCase.execute({
                testSuiteID: testSuiteId,
                testCaseIDs: body.testCaseIDs
            });
        }

        // Return the updated test suite
        const response: UpdateTestSuiteRes = {
            id: testSuite.id,
            name: testSuite.name,
            description: testSuite.description,
            testCaseIDs: testSuite.testCaseIDs
        };

        ctx.response.json(response);
    } catch (error: any) {
        const statusCode = error.message === 'Test Suite not found' ? 404 : 500;
        ctx.response.code = statusCode;
        ctx.response.json({ error: error.message || 'Failed to update test suite' } as any);
    }
}

export type Handle = typeof handle;
