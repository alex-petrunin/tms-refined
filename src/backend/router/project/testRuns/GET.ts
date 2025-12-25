import {Project, Issue} from "@/api/youtrack-types";
import { YouTrackTestRunRepository } from "@/backend/infrastructure/adapters/YouTrackTestRunRepository";

/**
 * @zod-to-schema
 */
export type GetTestRunReq = {
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
export type GetTestRunRes = {
    id: string;
    testCaseIDs: string[];
    testSuiteID: string;
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
    items: Array<GetTestRunRes>;
    total: number;
};

export default function handle(ctx: CtxGet<GetTestRunRes | ListTestRunsRes, GetTestRunReq>): void {
    const project = ctx.project as Project;
    
    // Extract test run ID from path or query parameter
    const testRunId = ctx.request.getParameter('id') || extractIdFromPath(ctx.request.path);
    const query = ctx.request.query;

    // Instantiate repository with YouTrack adapter
    const repository = new YouTrackTestRunRepository(
        project,
        ctx.settings,
        undefined, // appHost - optional, will use scripting API if available
        ctx.globalStorage // globalStorage for idempotency index
    );

    // If ID is provided, return single test run
    if (testRunId) {
        repository.findById(testRunId).then((testRun) => {
            if (!testRun) {
                ctx.response.code = 404;
                ctx.response.json({ error: 'Test run not found' } as any);
                return;
            }

            const response: GetTestRunRes = {
                id: testRun.id,
                testCaseIDs: testRun.testCaseIDs,
                testSuiteID: testRun.testSuiteID,
                status: testRun.status,
                executionTarget: {
                    id: testRun.executionTarget.id,
                    name: testRun.executionTarget.name,
                    type: testRun.executionTarget.type,
                    ref: testRun.executionTarget.ref
                }
            };

            ctx.response.json(response);
        }).catch((error) => {
            ctx.response.code = 500;
            ctx.response.json({ error: error.message || 'Failed to retrieve test run' } as any);
        });
        return;
    }

    // Otherwise, return list of test runs
    const limit = query.limit ? parseInt(query.limit as string, 10) : 100;
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0;
    const suiteId = query.suiteId as string | undefined;
    const status = query.status as string | undefined;
    const testCaseId = query.testCaseId as string | undefined;

    // Query all issues with testRunId extension property
    findIssuesByExtensionProperty('testRunId', project, ctx.settings).then((issues) => {
        // Map issues to test runs
        let testRuns = issues.map(issue => {
            const extProps = (issue as any).extensionProperties || {};
            const trId = extProps.testRunId || issue.id!;
            
            // Parse test case IDs from comma-separated string or array
            const testCaseIds = extProps.testCaseIds 
                ? (typeof extProps.testCaseIds === 'string' 
                    ? extProps.testCaseIds.split(',').map((id: string) => id.trim())
                    : extProps.testCaseIds)
                : [];

            return {
                id: trId,
                testCaseIDs: testCaseIds,
                testSuiteID: extProps.testSuiteId || '',
                status: extProps.testRunStatus || 'PENDING',
                executionTarget: {
                    id: extProps.executionTargetId || '',
                    name: extProps.executionTargetName || '',
                    type: extProps.executionTargetType || '',
                    ref: extProps.executionTargetRef || ''
                }
            };
        });

        // Apply filters
        if (suiteId) {
            testRuns = testRuns.filter(tr => tr.testSuiteID === suiteId);
        }
        if (status) {
            testRuns = testRuns.filter(tr => tr.status === status);
        }
        if (testCaseId) {
            testRuns = testRuns.filter(tr => tr.testCaseIDs.includes(testCaseId));
        }

        // Apply pagination
        const total = testRuns.length;
        const paginatedRuns = testRuns.slice(offset, offset + limit);

        const response: ListTestRunsRes = {
            items: paginatedRuns,
            total
        };

        ctx.response.json(response);
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to list test runs' } as any);
    });
}

/**
 * Helper function to find issues by extension property
 */
async function findIssuesByExtensionProperty(propertyName: string, project: Project, settings: AppSettings): Promise<Issue[]> {
    // Try scripting API first
    try {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const issues = entities.Issue.findByExtensionProperties({
            [propertyName]: { $exists: true }
        });
        
        if (issues && issues.size > 0) {
            return Array.from(issues).map((issue: any) => ({
                id: issue.id,
                summary: issue.summary,
                description: issue.description,
                extensionProperties: issue.extensionProperties
            } as Issue));
        }
    } catch (e) {
        // Scripting API not available, fallback to empty array
    }

    return [];
}

/**
 * Extracts test run ID from path
 * Handles paths like: /project/testRuns/{id} or /testRuns/{id}
 */
function extractIdFromPath(path: string): string | undefined {
    const match = path.match(/\/testRuns\/([^\/\?]+)/);
    return match ? match[1] : undefined;
}

export type Handle = typeof handle;

