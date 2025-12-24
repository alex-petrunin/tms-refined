import {Project} from "@/api/youtrack-types";
import { InMemoryTestSuiteRepository } from "@/backend/infrastructure/inMemory/InMemoryTestSuiteRepository";

/**
 * @zod-to-schema
 */
export type GetTestSuiteReq = {
    id?: string;
};

/**
 * @zod-to-schema
 */
export type GetTestSuiteRes = {
    id: string;
    name: string;
    description: string;
    testCaseIDs: string[];
};

export default function handle(ctx: CtxGet<GetTestSuiteRes, GetTestSuiteReq>): void {
    const project = ctx.project as Project;
    
    // Extract test suite ID from path or query parameter
    // Path format: /project/testSuites/{id} or query parameter: ?id={id}
    const testSuiteId = ctx.request.getParameter('id') || extractIdFromPath(ctx.request.path);

    if (!testSuiteId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test suite ID is required' } as any);
        return;
    }

    // Instantiate repository
    const repository = new InMemoryTestSuiteRepository();

    // Retrieve test suite
    repository.findByID(testSuiteId).then((testSuite) => {
        if (!testSuite) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Test suite not found' } as any);
            return;
        }

        const response: GetTestSuiteRes = {
            id: testSuite.id,
            name: testSuite.name,
            description: testSuite.description,
            testCaseIDs: testSuite.testCaseIDs
        };

        ctx.response.json(response);
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to retrieve test suite' } as any);
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

