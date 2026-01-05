// Import at module level - Rollup will bundle this
// The youtrackRouter plugin extracts the handler function, but Rollup processes imports first
// So the import needs to be here for Rollup to bundle it, even though the plugin extracts the handler
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
export type TestSuiteItem = {
    id: string;
    name: string;
    description: string;
    testCaseCount: number;
};

/**
 * @zod-to-schema
 */
export type GetTestSuiteRes = {
    items: Array<TestSuiteItem>;
    total: number;
};

/**
 * Get Test Suites Handler
 *
 * Uses DDD approach with YouTrackTestSuiteRepository.
 * The import is at the top level so Rollup can bundle it.
 * The youtrackRouter plugin extracts this handler function, but Rollup processes
 * the entire module first, so the import will be included in the bundle.
 */
export default function handle(ctx: CtxGet<GetTestSuiteRes, GetTestSuiteReq>): void {
    const project = ctx.project;
    
    if (!project) {
        ctx.response.code = 404;
        ctx.response.json({ error: 'Project not found' } as any);
        return;
    }

    // Extract query parameters using getParameter
    const getParam = (name: string): string | undefined => {
        if (ctx.request.getParameter) {
            const val = ctx.request.getParameter(name);
            return val || undefined;
        }
        return undefined;
    };

    const testSuiteId = getParam('id');
    const limitParam = getParam('limit');
    const offsetParam = getParam('offset');
    const searchParam = getParam('search');

    try {
        // Use the imported repository class
        // Rollup should have bundled this import into the module
        const repository = new YouTrackTestSuiteRepository(project);

        // If ID is provided, return single test suite wrapped in list format
        if (testSuiteId) {
            const testSuite = repository.findByID(testSuiteId);

            if (!testSuite) {
                ctx.response.code = 404;
                ctx.response.json({ error: 'Test suite not found' } as any);
                return;
            }

            const response: GetTestSuiteRes = {
                items: [{
                    id: testSuite.id,
                    name: testSuite.name,
                    description: testSuite.description,
                    testCaseCount: testSuite.testCaseIDs.length
                }],
                total: 1
            };

            ctx.response.json(response);
            return;
        }

        // Fetch all test suites from repository
        const testSuites = repository.findAll();

        // Map domain entities to response DTOs
        let suiteItems: TestSuiteItem[] = testSuites.map((suite: any) => ({
            id: suite.id,
            name: suite.name,
            description: suite.description,
            testCaseCount: suite.testCaseIDs.length
        }));

        // Apply search filter if provided
        if (searchParam) {
            const searchLower = searchParam.toLowerCase();
            suiteItems = suiteItems.filter(suite =>
                suite.name.toLowerCase().includes(searchLower) ||
                suite.description.toLowerCase().includes(searchLower)
            );
        }

        // Apply pagination
        const limit = limitParam ? parseInt(limitParam, 10) : 100;
        const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
        const total = suiteItems.length;
        const paginatedSuites = suiteItems.slice(offset, offset + limit);

        const response: GetTestSuiteRes = {
            items: paginatedSuites,
            total
        };

        ctx.response.json(response);
    } catch (error: any) {
        console.error('[GET testSuites] Error:', error);
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        ctx.response.code = 500;
        ctx.response.json({
            error: error?.message || String(error) || 'Failed to fetch test suites'
        } as any);
    }
}

export type Handle = typeof handle;
