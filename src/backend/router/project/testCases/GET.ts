import {Project} from "@/api/youtrack-types";
import { InMemoryTestCaseRepository } from "@/backend/infrastructure/inMemory/InMemoryTestCaseRepository";

/**
 * @zod-to-schema
 */
export type GetTestCaseReq = {
    id?: string;
};

/**
 * @zod-to-schema
 */
export type GetTestCaseRes = {
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

export default function handle(ctx: CtxGet<GetTestCaseRes, GetTestCaseReq>): void {
    const project = ctx.project as Project;
    
    // Extract test case ID from path or query parameter
    // Path format: /project/testCases/{id} or query parameter: ?id={id}
    const testCaseId = ctx.request.getParameter('id') || extractIdFromPath(ctx.request.path);

    if (!testCaseId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test case ID is required' } as any);
        return;
    }

    // Instantiate repository
    const repository = new InMemoryTestCaseRepository();

    // Retrieve test case
    repository.findByID(testCaseId).then((testCase) => {
        if (!testCase) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Test case not found' } as any);
            return;
        }

        const response: GetTestCaseRes = {
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
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to retrieve test case' } as any);
    });
}

/**
 * Extracts test case ID from path
 * Handles paths like: /project/testCases/{id} or /testCases/{id}
 */
function extractIdFromPath(path: string): string | undefined {
    const match = path.match(/\/testCases\/([^\/\?]+)/);
    return match ? match[1] : undefined;
}

export type Handle = typeof handle;

