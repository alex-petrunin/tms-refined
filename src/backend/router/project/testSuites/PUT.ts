import {Project} from "@/api/youtrack-types";
import { UpdateTestSuiteMetadataUseCase } from "@/backend/application/usecases/UpdateTestSuiteMetadata";
import { UpdateTestSuiteCompositionUseCase } from "@/backend/application/usecases/UpdateTestSuiteComposition";
import { InMemoryTestSuiteRepository } from "@/backend/infrastructure/inMemory/InMemoryTestSuiteRepository";

/**
 * @zod-to-schema
 */
export type UpdateTestSuiteReq = {
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
    const project = ctx.project as Project;
    const body = ctx.request.json();

    // Extract test suite ID from path or query parameter
    const testSuiteId = ctx.request.getParameter('id') || extractIdFromPath(ctx.request.path);

    if (!testSuiteId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test suite ID is required' } as any);
        return;
    }

    // Instantiate repository and use cases
    const repository = new InMemoryTestSuiteRepository();
    const updateMetadataUseCase = new UpdateTestSuiteMetadataUseCase(repository);
    const updateCompositionUseCase = new UpdateTestSuiteCompositionUseCase(repository);

    // Update metadata if provided
    const metadataPromise = (body.name !== undefined || body.description !== undefined)
        ? updateMetadataUseCase.execute({
            testSuiteID: testSuiteId,
            name: body.name,
            description: body.description
        })
        : Promise.resolve();

    // Update composition if provided
    const compositionPromise = body.testCaseIDs !== undefined
        ? updateCompositionUseCase.execute({
            testSuiteID: testSuiteId,
            testCaseIDs: body.testCaseIDs
        })
        : Promise.resolve();

    // Execute both updates in parallel, then retrieve updated test suite
    Promise.all([metadataPromise, compositionPromise])
        .then(() => repository.findByID(testSuiteId))
        .then((testSuite) => {
            if (!testSuite) {
                ctx.response.code = 404;
                ctx.response.json({ error: 'Test suite not found' } as any);
                return;
            }

            const response: UpdateTestSuiteRes = {
                id: testSuite.id,
                name: testSuite.name,
                description: testSuite.description,
                testCaseIDs: testSuite.testCaseIDs
            };

            ctx.response.json(response);
        })
        .catch((error) => {
            ctx.response.code = error.message === 'Test Suite not found' ? 404 : 500;
            ctx.response.json({ error: error.message || 'Failed to update test suite' } as any);
        });
}

/**
 * Extracts test suite ID from path
 * Handles paths like: /project/testSuites/{id} or /testSuites/{id}
 */
function extractIdFromPath(path: string): string | undefined {
    const match = path.match(/\/testSuites\/([^\/\?]+)/);
    return match ? match[1] : undefined;
}

export type Handle = typeof handle;

