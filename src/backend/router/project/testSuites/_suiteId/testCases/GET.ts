import { YouTrackTestCaseRepositorySync } from "../../../../../infrastructure/adapters/YouTrackTestCaseRepositorySync";

/**
 * @zod-to-schema
 */
export type GetSuiteTestCasesReq = {
    projectId?: string;
    suiteID: string;
    limit?: number;
    offset?: number;
    includeExecutionTarget?: boolean;
};

/**
 * @zod-to-schema
 */
export type ExecutionTargetData = {
    integrationId: string;
    name: string;
    type: string;
    config: Record<string, any>;
};

/**
 * @zod-to-schema
 */
export type SuiteTestCaseItem = {
    id: string;
    issueId?: string;
    summary: string;
    description: string;
    executionTarget?: ExecutionTargetData;
};

/**
 * @zod-to-schema
 */
export type GetSuiteTestCasesRes = {
    suiteId: string;
    items: SuiteTestCaseItem[];
    total: number;
};

/**
 * Get Test Cases for a Suite Handler
 * Fetches all test cases belonging to a specific test suite
 */
export default function handle(ctx: CtxGet<GetSuiteTestCasesRes, GetSuiteTestCasesReq>): void {
    // Helper: Find issue by test case ID
    const findIssueByTestCaseId = (testCaseId: string, project: any): any => {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        // Try to find by issue ID first
        try {
            const issue = entities.Issue.findById(testCaseId);
            if (issue) {
                return issue;
            }
        } catch (e) {
            // Not found by ID, try extension property
        }
        
        // Fallback: search by extension property
        try {
            const issues = entities.Issue.findByExtensionProperties({
                testCaseId: testCaseId
            });
            
            if (issues && issues.size > 0) {
                return Array.from(issues)[0];
            }
        } catch (e) {
            // Fallback: manual search
            const search = require('@jetbrains/youtrack-scripting-api/search');
            const allIssues = search.search(project, '') || [];
            const issuesArray: any[] = [];
            if (allIssues && typeof allIssues.forEach === 'function') {
                allIssues.forEach((issue: any) => issuesArray.push(issue));
            }
            
            for (const issue of issuesArray) {
                const extProps = issue.extensionProperties || {};
                if (extProps.testCaseId === testCaseId) {
                    return issue;
                }
            }
        }
        
        return null;
    };
    
    try {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        // Get query params
        const getParam = (name: string): string | undefined => {
            if (ctx.request.getParameter) {
                const val = ctx.request.getParameter(name);
                return val || undefined;
            }
            return undefined;
        };
        
        const suiteID = getParam('suiteID') || ctx.request.json()?.suiteID;
        if (!suiteID) {
            ctx.response.code = 400;
            ctx.response.json({ error: 'Suite ID is required' } as any);
            return;
        }
        
        const query = {
            suiteID: suiteID,
            projectId: getParam('projectId'),
            limit: getParam('limit') ? Number(getParam('limit')) : 50,
            offset: getParam('offset') ? Number(getParam('offset')) : 0,
            includeExecutionTarget: getParam('includeExecutionTarget') === 'true'
        };

        // Verify project exists
        const projectKey = ctx.project.shortName || ctx.project.key;
        const ytProject = entities.Project.findByKey(projectKey);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Initialize repository
        const repository = new YouTrackTestCaseRepositorySync(projectKey, ctx.currentUser);

        // Get all test cases and filter by suite ID
        const allTestCases = repository.findAll();
        
        // Map to response items with issue data, filtering by suite ID
        const testCases: SuiteTestCaseItem[] = allTestCases
            .map(testCase => {
                const issue = findIssueByTestCaseId(testCase.id, ytProject);
                const suiteIdFromIssue = issue?.extensionProperties?.suiteId;
                
                // Only include cases that belong to this suite
                if (suiteIdFromIssue !== query.suiteID) {
                    return null;
                }
                
                const item: SuiteTestCaseItem = {
                    id: testCase.id,
                    issueId: issue?.idReadable || issue?.id || '',
                    summary: testCase.summary || '',
                    description: testCase.description || ''
                };
                
                // Include execution target if requested
                if (query.includeExecutionTarget && testCase.executionTargetSnapshot) {
                    item.executionTarget = {
                        integrationId: testCase.executionTargetSnapshot.integrationId,
                        name: testCase.executionTargetSnapshot.name,
                        type: testCase.executionTargetSnapshot.type,
                        config: testCase.executionTargetSnapshot.config
                    };
                }
                
                return item;
            })
            .filter((item): item is SuiteTestCaseItem => item !== null);

        // Calculate total before pagination
        const total = testCases.length;

        // Apply pagination
        const paginatedItems = testCases.slice(query.offset, query.offset + query.limit);

        ctx.response.json({
            suiteId: query.suiteID,
            items: paginatedItems,
            total: total
        });
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ 
            error: error.message || `Failed to fetch test cases for suite: ${error}`,
            suiteId: '',
            items: [],
            total: 0
        } as any);
    }
}

export type Handle = typeof handle;

