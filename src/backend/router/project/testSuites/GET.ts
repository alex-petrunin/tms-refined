import {Project} from "@/api/youtrack-types";
import { YouTrackTestSuiteRepository } from "@/backend/infrastructure/adapters/YouTrackTestSuiteRepository";

/**
 * @zod-to-schema
 */
export type GetTestSuiteReq = {
    projectId: string;
    id?: string;
    limit?: number;
    offset?: number;
    search?: string;
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

/**
 * @zod-to-schema
 */
export type ListTestSuitesRes = {
    items: Array<GetTestSuiteRes>;
    total: number;
};

export default function handle(ctx: CtxGet<GetTestSuiteRes | ListTestSuitesRes, GetTestSuiteReq>): void {
    const project = ctx.project as Project;
    
    // Extract test suite ID from path or query parameter
    const testSuiteId = ctx.request.getParameter('id') || extractIdFromPath(ctx.request.path);
    const query = ctx.request.query;

    // Instantiate repository with YouTrack adapter
    const repository = new YouTrackTestSuiteRepository(
        project,
        ctx.settings,
        undefined // appHost - optional, will use scripting API if available
    );

    // If ID is provided, return single test suite
    if (testSuiteId) {
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
        return;
    }

    // Otherwise, return list of test suites
    const limit = query.limit ? parseInt(query.limit as string, 10) : 100;
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0;
    const search = query.search as string | undefined;

    // Load all test suites from project extension properties
    repository['loadAllTestSuites']().then((allSuites) => {
        // Apply search filter if provided
        let filteredSuites = allSuites;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredSuites = allSuites.filter(suite => 
                suite.name.toLowerCase().includes(searchLower) ||
                suite.description.toLowerCase().includes(searchLower)
            );
        }

        // Apply pagination
        const total = filteredSuites.length;
        const paginatedSuites = filteredSuites.slice(offset, offset + limit);

        const response: ListTestSuitesRes = {
            items: paginatedSuites.map(suite => ({
                id: suite.id,
                name: suite.name,
                description: suite.description,
                testCaseIDs: suite.testCaseIDs
            })),
            total
        };

        ctx.response.json(response);
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to list test suites' } as any);
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
