import { YouTrackTestCaseRepositorySync } from "../../../infrastructure/adapters/YouTrackTestCaseRepositorySync";

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
export type TestCaseItem = {
    id: string;
    issueId?: string;
    summary: string;
    description: string;
    suiteId?: string;
    executionTarget?: ExecutionTargetData;
};

/**
 * @zod-to-schema
 */
export type GetTestCaseRes = {
    items: TestCaseItem[];
    total: number;
};

/**
 * Get Test Cases Handler - DDD Approach
 * Uses YouTrackTestCaseRepositorySync
 */
export default function handle(ctx: CtxGet<GetTestCaseRes, GetTestCaseReq>): void {
    // Helper: Find issue by test case ID
    const findIssueByTestCaseId = (testCaseId: string, project: any): any => {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        // Try to find by issue ID first (testCaseId is now the actual issue ID like "TEST-123")
        try {
            const issue = entities.Issue.findById(testCaseId);
            if (issue) {
                return issue;
            }
        } catch (e) {
            // Not found by ID, try extension property (legacy/fallback)
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
            limit: getParam('limit') ? Number(getParam('limit')) : 50,
            offset: getParam('offset') ? Number(getParam('offset')) : 0,
            search: getParam('search'),
            suiteId: getParam('suiteId'),
            includeExecutionTarget: getParam('includeExecutionTarget') === 'true'
        };
        

        try {
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

        // Get test cases based on query
        let testCases: TestCaseItem[];
        
        if (query.id) {
            // Get specific test case
            const testCase = repository.findByID(query.id);
            if (!testCase) {
                ctx.response.code = 404;
                ctx.response.json({ error: `Test case not found: ${query.id}` } as any);
                return;
            }
            
            const issue = findIssueByTestCaseId(query.id, ytProject);
            const item: TestCaseItem = {
                id: testCase.id,
                issueId: issue?.idReadable || issue?.id,
                summary: testCase.summary,
                description: testCase.description,
                suiteId: issue?.extensionProperties?.suiteId
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
            
            testCases = [item];
        } else {
            // Get all test cases and filter
            const allTestCases = repository.findAll();
            
            // Map to response items with issue data
            testCases = allTestCases
                .map(testCase => {
                    const issue = findIssueByTestCaseId(testCase.id, ytProject);
                    const suiteIdFromIssue = issue?.extensionProperties?.suiteId;
                    const item: TestCaseItem = {
                        id: testCase.id,
                        issueId: issue?.idReadable || issue?.id || '',
                        summary: testCase.summary || '',
                        description: testCase.description || '',
                        suiteId: suiteIdFromIssue
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
                .filter(item => {
                    // Filter by suiteId if provided
                    if (query.suiteId && item.suiteId !== query.suiteId) {
                        return false;
                    }
                    // Filter by search if provided
                    if (query.search) {
                        const searchLower = query.search.toLowerCase();
                        return item.summary.toLowerCase().includes(searchLower) ||
                               item.description.toLowerCase().includes(searchLower);
                    }
                    return true;
                });
        }

        // Calculate total before pagination
        const total = testCases.length;

        // Apply pagination
        const paginatedItems = testCases.slice(query.offset, query.offset + query.limit);

        ctx.response.json({
            items: paginatedItems,
            total: total
        });
        } catch (innerError: any) {
            ctx.response.code = 500;
            ctx.response.json({ error: innerError?.message || 'Failed to fetch test cases' } as any);
        }
    } catch (outerError: any) {
        ctx.response.code = 500;
        ctx.response.json({ 
            error: outerError?.message || 'Handler initialization failed',
            items: [],
            total: 0
        } as any);
    }
}

export type Handle = typeof handle;
