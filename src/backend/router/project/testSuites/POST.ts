import {Project} from "@/api/youtrack-types";
import { CreateTestSuiteUseCase } from "@/backend/application/usecases/CreateTestSuite";
import { InMemoryTestSuiteRepository } from "@/backend/infrastructure/inMemory/InMemoryTestSuiteRepository";

/**
 * @zod-to-schema
 */
export type CreateTestSuiteReq = {
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
    const project = ctx.project as Project;
    const body = ctx.request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Name is required' } as any);
        return;
    }

    // Instantiate repository and use case
    const repository = new InMemoryTestSuiteRepository();
    const createTestSuiteUseCase = new CreateTestSuiteUseCase(repository);

    // Execute use case
    createTestSuiteUseCase.execute({
        name: body.name,
        description: body.description
    }).then((testSuiteId) => {
        // Retrieve the created test suite to return full details
        return repository.findByID(testSuiteId).then((testSuite) => {
            if (!testSuite) {
                ctx.response.code = 500;
                ctx.response.json({ error: 'Failed to retrieve created test suite' } as any);
                return;
            }

            const response: CreateTestSuiteRes = {
                id: testSuite.id,
                name: testSuite.name,
                description: testSuite.description,
                testCaseIDs: testSuite.testCaseIDs
            };

            ctx.response.json(response);
        });
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to create test suite' } as any);
    });
}

export type Handle = typeof handle;

