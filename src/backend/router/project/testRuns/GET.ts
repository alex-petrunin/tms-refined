/**
 * @zod-to-schema
 */
export type GetTestRunReq = {
    projectId?: string;
    id?: string;
    limit?: number;
    offset?: number;
    suiteId?: string;
    status?: string;
    testCaseId?: string;
};

/**
 * @zod-to-schema
 */
export type GetTestRunItem = {
    id: string;
    testCaseIDs: string[];
    testSuiteID: string;
    testSuiteName: string;
    status: string;
    executionTarget: {
        id: string;
        name: string;
        type: string;
        ref: string;
    };
};

/**
 * @zod-to-schema
 */
export type ListTestRunsRes = {
    items: Array<GetTestRunItem>;
    total: number;
};

export default function handle(ctx: CtxGet<ListTestRunsRes, GetTestRunReq>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const search = require('@jetbrains/youtrack-scripting-api/search');
    const project = ctx.project;

    // Get query params using getParameter
    const getParam = (name: string): string | undefined => {
        if (ctx.request.getParameter) {
            const val = ctx.request.getParameter(name);
            return val || undefined;
        }
        return undefined;
    };

    const query = {
        id: getParam('id'),
        limit: getParam('limit') ? Number(getParam('limit')) : 50,
        offset: getParam('offset') ? Number(getParam('offset')) : 0,
        suiteId: getParam('suiteId'),
        status: getParam('status'),
        testCaseId: getParam('testCaseId')
    };

    console.log('[GET testRuns] Query params - id:', query.id, 'status:', query.status);

    try {
        // Get test runs project from settings, or fallback to current project
        const testRunProjects = ctx.settings.testRunProjects as any;
        let targetProjectKey: string;
        
        if (testRunProjects) {
            // Extract project key from settings (can be shortName, key, or id)
            targetProjectKey = testRunProjects.shortName || testRunProjects.key || testRunProjects.id;
        }
        
        // Fallback to current project if no test runs project configured
        if (!targetProjectKey) {
            targetProjectKey = project.shortName || project.key || '';
        }
        
        // Find the YouTrack project entity for test runs
        const ytProject = entities.Project.findByKey(targetProjectKey);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: `Test runs project not found: ${targetProjectKey}` } as any);
            return;
        }

        // Load suites to resolve names - try to load from current project (where suites are stored)
        let suiteMap: Record<string, string> = {};
        try {
            // Suites are stored in the current project (test suites project), not test runs project
            const currentProject = entities.Project.findByKey(project.shortName || project.key);
            if (currentProject) {
                const suitesJson = currentProject.extensionProperties.testSuites;
                if (suitesJson && typeof suitesJson === 'string') {
                    const suites = JSON.parse(suitesJson);
                    suiteMap = Object.fromEntries(
                        suites.map((s: any) => [s.id, s.name])
                    );
                }
            }
        } catch (e) {
            console.warn('[GET testRuns] Failed to load suites for name resolution:', e);
        }

        // Search for all issues in the test runs project
        const allIssues = search.search(ytProject, '') || [];

        // Convert to array if needed (YouTrack returns a Set)
        const issuesArray: any[] = [];
        if (allIssues && typeof allIssues.forEach === 'function') {
            allIssues.forEach((issue: any) => {
                issuesArray.push(issue);
            });
        } else if (Array.isArray(allIssues)) {
            issuesArray.push(...allIssues);
        }

        // Filter to only test runs (issues with testRunId extension property)
        const testRuns: GetTestRunItem[] = [];

        for (let i = 0; i < issuesArray.length && i < 1000; i++) {
            const issue = issuesArray[i];
            if (!issue) continue;

            const extProps = issue.extensionProperties || {};
            const testRunId = extProps.testRunId;

            // Skip issues that are not test runs
            if (!testRunId) {
                continue;
            }

            // Filter by specific id if provided
            if (query.id && testRunId !== query.id) {
                continue;
            }

            // Filter by suiteId if provided
            const suiteId = extProps.testSuiteId || '';
            if (query.suiteId && suiteId !== query.suiteId) {
                continue;
            }

            // Filter by status if provided
            const status = extProps.testRunStatus || 'PENDING';
            if (query.status && status !== query.status) {
                continue;
            }

            // Parse test case IDs from comma-separated string
            const testCaseIdsStr = extProps.testCaseIds || '';
            const testCaseIDs = testCaseIdsStr
                ? testCaseIdsStr.split(',').map((id: string) => id.trim()).filter(Boolean)
                : [];

            // Filter by testCaseId if provided
            if (query.testCaseId && !testCaseIDs.includes(query.testCaseId)) {
                continue;
            }

            // Resolve suite name
            const suiteName = suiteMap[suiteId] || suiteId;

            testRuns.push({
                id: testRunId,
                testCaseIDs: testCaseIDs,
                testSuiteID: suiteId,
                testSuiteName: suiteName,
                status: status,
                executionTarget: {
                    id: extProps.executionTargetId || '',
                    name: extProps.executionTargetName || 'Manual',
                    type: extProps.executionTargetType || 'MANUAL',
                    ref: extProps.executionTargetRef || ''
                }
            });
        }

        // If single ID was requested, return that item
        if (query.id) {
            if (testRuns.length === 0) {
                ctx.response.code = 404;
                ctx.response.json({ error: `Test run not found: ${query.id}` } as any);
                return;
            }
            // Return as list format for consistency
            const response: ListTestRunsRes = {
                items: testRuns,
                total: 1
            };
            ctx.response.json(response);
            return;
        }

        // Calculate total before pagination
        const total = testRuns.length;

        // Apply pagination
        const paginatedItems = testRuns.slice(query.offset, query.offset + query.limit);

        const response: ListTestRunsRes = {
            items: paginatedItems,
            total: total
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to fetch test runs: ${error}` } as any);
    }
}

export type Handle = typeof handle;
