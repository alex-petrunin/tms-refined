import { YouTrackTestRunRepositorySync } from "../../../infrastructure/adapters/YouTrackTestRunRepositorySync";

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

/**
 * Get Test Runs Handler - DDD Approach
 * Uses YouTrackTestRunRepositorySync
 */
export default function handle(ctx: CtxGet<ListTestRunsRes, GetTestRunReq>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');

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
            targetProjectKey = testRunProjects.shortName || testRunProjects.key || testRunProjects.id;
        } else {
            targetProjectKey = ctx.project.shortName || ctx.project.key || '';
        }
        
        // Verify project exists
        const ytProject = entities.Project.findByKey(targetProjectKey);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: `Test runs project not found: ${targetProjectKey}` } as any);
            return;
        }

        // Load suites to resolve names
        let suiteMap: Record<string, string> = {};
        try {
            const currentProject = entities.Project.findByKey(ctx.project.shortName || ctx.project.key);
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

        // Initialize repository
        const repository = new YouTrackTestRunRepositorySync(targetProjectKey, ctx.currentUser);

        // Get test runs based on query
        let testRuns: GetTestRunItem[];
        
        if (query.id) {
            // Get specific test run
            const testRun = repository.findById(query.id);
            if (!testRun) {
                ctx.response.code = 404;
                ctx.response.json({ error: `Test run not found: ${query.id}` } as any);
                return;
            }
            
            testRuns = [{
                id: testRun.id,
                testCaseIDs: testRun.testCaseIDs,
                testSuiteID: testRun.testSuiteID,
                testSuiteName: suiteMap[testRun.testSuiteID] || testRun.testSuiteID,
                status: testRun.status,
                executionTarget: {
                    id: testRun.executionTarget.id,
                    name: testRun.executionTarget.name,
                    type: testRun.executionTarget.type,
                    ref: testRun.executionTarget.ref
                }
            }];
        } else {
            // Get all test runs and filter
            const allTestRuns = repository.findAll();
            
            testRuns = allTestRuns
                .filter(testRun => {
                    // Filter by suiteId if provided
                    if (query.suiteId && testRun.testSuiteID !== query.suiteId) {
                        return false;
                    }
                    // Filter by status if provided
                    if (query.status && testRun.status !== query.status) {
                        return false;
                    }
                    // Filter by testCaseId if provided
                    if (query.testCaseId && !testRun.testCaseIDs.includes(query.testCaseId)) {
                        return false;
                    }
                    return true;
                })
                .map(testRun => ({
                    id: testRun.id,
                    testCaseIDs: testRun.testCaseIDs,
                    testSuiteID: testRun.testSuiteID,
                    testSuiteName: suiteMap[testRun.testSuiteID] || testRun.testSuiteID,
                    status: testRun.status,
                    executionTarget: {
                        id: testRun.executionTarget.id,
                        name: testRun.executionTarget.name,
                        type: testRun.executionTarget.type,
                        ref: testRun.executionTarget.ref
                    }
                }));
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
