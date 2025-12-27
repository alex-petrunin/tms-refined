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
    
    // Extract query parameters safely (query might be undefined)
    const query = ctx.request.query || {};
    const testSuiteId = ctx.request.getParameter ? ctx.request.getParameter('id') : query.id;

    // Load all test suites from project extension properties (inline)
    let allSuites: TestSuiteItem[] = [];
    try {
        const extProps = project.extensionProperties || {};
        const suitesJson = extProps.testSuites;

        if (suitesJson && typeof suitesJson === 'string') {
            const suitesData = JSON.parse(suitesJson);
            allSuites = suitesData.map((data: any) => ({
                id: data.id || '',
                name: data.name || '',
                description: data.description || '',
                testCaseIDs: data.testCaseIDs || []
            }));
        }
    } catch (error) {
        console.error("Failed to parse test suites:", error);
    }

    // If ID is provided, return single test suite wrapped in list format
    if (testSuiteId) {
        const testSuite = allSuites.find(s => s.id === testSuiteId);
        
        if (!testSuite) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Test suite not found' } as any);
            return;
        }

        const response: GetTestSuiteRes = {
            items: [testSuite],
            total: 1
        };

        ctx.response.json(response);
        return;
    }

    // Otherwise, return list of test suites with pagination
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
        items: paginatedSuites,
        total
    };

    ctx.response.json(response);
}

export type Handle = typeof handle;
