/**
 * @zod-to-schema
 */
export type GetTestCaseReq = {
    projectId?: string;
    id?: string;
    limit?: number;
    offset?: number;
    search?: string;
    suiteId?: string;
};

/**
 * @zod-to-schema
 */
export type TestCaseItem = {
    id: string;
    issueId?: string;
    summary: string;
    description: string;
    suiteId?: string;
};

/**
 * @zod-to-schema
 */
export type GetTestCaseRes = {
    items: TestCaseItem[];
    total: number;
};

export default function handle(ctx: CtxGet<GetTestCaseRes, GetTestCaseReq>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const search = require('@jetbrains/youtrack-scripting-api/search');
    const project = ctx.project;
    
    // Get query params using getParameter (YouTrack HTTP handler API)
    const getParam = (name: string): string | undefined => {
        if (ctx.request.getParameter) {
            const val = ctx.request.getParameter(name);
            return val || undefined;
        }
        return undefined;
    };
    
    const query = {
        id: getParam('id'),
        projectId: getParam('projectId'),
        limit: getParam('limit') ? Number(getParam('limit')) : undefined,
        offset: getParam('offset') ? Number(getParam('offset')) : undefined,
        search: getParam('search'),
        suiteId: getParam('suiteId')
    };
    
    // Debug logging
    console.log('[GET testCases] Query params - id:', query.id, 'suiteId:', query.suiteId);

    try {
        // Find the YouTrack project entity
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Search for all issues in the project
        let searchQuery = '';
        if (query.search) {
            searchQuery = query.search;
        }
        
        const allIssues = search.search(ytProject, searchQuery) || [];
        
        // Convert to array if needed (YouTrack returns a Set)
        const issuesArray: any[] = [];
        if (allIssues && typeof allIssues.forEach === 'function') {
            allIssues.forEach((issue: any) => {
                issuesArray.push(issue);
            });
        } else if (Array.isArray(allIssues)) {
            issuesArray.push(...allIssues);
        }

        // Filter to only test cases (issues with testCaseId extension property)
        const testCases: TestCaseItem[] = [];
        
        for (let i = 0; i < issuesArray.length && i < 1000; i++) {
            const issue = issuesArray[i];
            if (!issue) continue;
            
            const extProps = issue.extensionProperties || {};
            const testCaseId = extProps.testCaseId;
            
            // Skip issues that are not test cases
            if (!testCaseId) {
                continue;
            }
            
            // Filter by specific id if provided
            const filterById = query.id;
            if (filterById && testCaseId !== filterById) {
                console.log('[GET testCases] Skipping', testCaseId, 'does not match filter', filterById);
                continue;
            }
            
            // Filter by suiteId if provided
            const suiteId = extProps.suiteId;
            const filterBySuiteId = query.suiteId;
            if (filterBySuiteId && suiteId !== filterBySuiteId) {
                continue;
            }
            
            console.log('[GET testCases] Including test case:', testCaseId);
            testCases.push({
                id: testCaseId,
                issueId: issue.idReadable || issue.id,
                summary: issue.summary || '',
                description: issue.description || '',
                suiteId: suiteId || undefined
            });
        }

        // Calculate total before pagination
        const total = testCases.length;

        // Apply pagination
        const offset = query.offset || 0;
        const limit = query.limit || 50;
        const paginatedItems = testCases.slice(offset, offset + limit);

        const response: GetTestCaseRes = {
            items: paginatedItems,
            total: total
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to fetch test cases: ${error}` } as any);
    }
}

export type Handle = typeof handle;
