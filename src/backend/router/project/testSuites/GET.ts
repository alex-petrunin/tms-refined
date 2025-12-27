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

export default function handle(ctx: CtxGet<GetTestSuiteRes, GetTestSuiteReq>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const search = require('@jetbrains/youtrack-scripting-api/search');
    const project = ctx.project;
    
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

    // Find the YouTrack project entity for reading
    const ytProject = entities.Project.findByKey(project.shortName || project.key);
    if (!ytProject) {
        ctx.response.code = 404;
        ctx.response.json({ error: 'Project not found' } as any);
        return;
    }
    
    // Count actual test cases per suite by querying issues
    const testCaseCountBySuite: Record<string, number> = {};
    try {
        const allIssues = search.search(ytProject, '') || [];
        
        // Convert to array if needed
        const issuesArray: any[] = [];
        if (allIssues && typeof allIssues.forEach === 'function') {
            allIssues.forEach((issue: any) => {
                issuesArray.push(issue);
            });
        } else if (Array.isArray(allIssues)) {
            issuesArray.push(...allIssues);
        }
        
        // Count test cases per suite
        for (let i = 0; i < issuesArray.length && i < 1000; i++) {
            const issue = issuesArray[i];
            if (!issue) continue;
            
            const extProps = issue.extensionProperties || {};
            const testCaseId = extProps.testCaseId;
            const suiteId = extProps.suiteId;
            
            // Only count issues that are test cases
            if (testCaseId && suiteId) {
                testCaseCountBySuite[suiteId] = (testCaseCountBySuite[suiteId] || 0) + 1;
            }
        }
    } catch (error) {
        console.warn('[GET testSuites] Failed to count test cases:', error);
    }
    
    // Load all test suites from project extension properties
    let allSuites: TestSuiteItem[] = [];
    try {
        const extProps = ytProject?.extensionProperties || project.extensionProperties || {};
        const suitesJson = extProps.testSuites;

        if (suitesJson && typeof suitesJson === 'string') {
            const suitesData = JSON.parse(suitesJson);
            allSuites = suitesData.map((data: any) => ({
                id: data.id || '',
                name: data.name || '',
                description: data.description || '',
                testCaseCount: testCaseCountBySuite[data.id] || 0
            }));
        }
    } catch (error) {
        console.error("[GET testSuites] Failed to parse test suites:", error);
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
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Apply search filter if provided
    let filteredSuites = allSuites;
    if (searchParam) {
        const searchLower = searchParam.toLowerCase();
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
