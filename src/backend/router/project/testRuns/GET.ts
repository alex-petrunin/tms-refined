import {Project} from "@/api/youtrack-types";
import { InMemoryTestRunRepository } from "@/backend/infrastructure/inMemory/InMemoryTestRunRepository";

/**
 * @zod-to-schema
 */
export type GetTestRunReq = {
    id?: string;
};

/**
 * @zod-to-schema
 */
export type GetTestRunRes = {
    id: string;
    testCaseIDs: string[];
    testSuiteID: string;
    status: string;
    executionTarget: {
        id: string;
        name: string;
        type: string;
        ref: string;
    };
};

export default function handle(ctx: CtxGet<GetTestRunRes, GetTestRunReq>): void {
    const project = ctx.project as Project;
    
    // Extract test run ID from path or query parameter
    // Path format: /project/testRuns/{id} or query parameter: ?id={id}
    const testRunId = ctx.request.getParameter('id') || extractIdFromPath(ctx.request.path);

    if (!testRunId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test run ID is required' } as any);
        return;
    }

    // Instantiate repository
    const repository = new InMemoryTestRunRepository();

    // Retrieve test run
    repository.findById(testRunId).then((testRun) => {
        if (!testRun) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Test run not found' } as any);
            return;
        }

        const response: GetTestRunRes = {
            id: testRun.id,
            testCaseIDs: testRun.testCaseIDs,
            testSuiteID: testRun.testSuiteID,
            status: testRun.status,
            executionTarget: {
                id: testRun.executionTarget.id,
                name: testRun.executionTarget.name,
                type: testRun.executionTarget.type,
                ref: testRun.executionTarget.ref
            }
        };

        ctx.response.json(response);
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to retrieve test run' } as any);
    });
}

/**
 * Extracts test run ID from path
 * Handles paths like: /project/testRuns/{id} or /testRuns/{id}
 */
function extractIdFromPath(path: string): string | undefined {
    const match = path.match(/\/testRuns\/([^\/\?]+)/);
    return match ? match[1] : undefined;
}

export type Handle = typeof handle;

