import { YouTrackTestSuiteRepository } from "../../../infrastructure/adapters/YouTrackTestSuiteRepository";

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
    testCaseIDs: string[];
};

/**
 * @zod-to-schema
 */
export type GetTestSuiteRes = {
    items: Array<TestSuiteItem>;
    total: number;
};

export default function handle(ctx: CtxGet<GetTestSuiteRes, GetTestSuiteReq>): void {
    const project = ctx.project;
    const repository = new YouTrackTestSuiteRepository(project);
    
    // Extract test suite ID from query parameter
    const testSuiteId = ctx.request.getParameter('id');
    const query = ctx.request.query;

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
                testCaseIDs: testSuite.testCaseIDs
            }],
            total: 1
        };

        ctx.response.json(response);
        return;
    }

    // Otherwise, return list of test suites with pagination
    const allSuites = repository.findAll();
    const limit = query.limit ? parseInt(query.limit as string, 10) : 100;
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0;
    const search = query.search as string | undefined;

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

    const response: GetTestSuiteRes = {
        items: paginatedSuites.map(suite => ({
            id: suite.id,
            name: suite.name,
            description: suite.description,
            testCaseIDs: suite.testCaseIDs
        })),
        total
    };

    ctx.response.json(response);
}

export type Handle = typeof handle;
