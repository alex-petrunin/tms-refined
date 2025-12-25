import {Project, Issue} from "@/api/youtrack-types";
import { YouTrackTestCaseRepository } from "@/backend/infrastructure/adapters/YouTrackTestCaseRepository";
import { YouTrackTestSuiteRepository } from "@/backend/infrastructure/adapters/YouTrackTestSuiteRepository";

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
export type GetTestCaseRes = {
    id: string;
    summary: string;
    description: string;
    executionTargetSnapshot?: {
        id: string;
        name: string;
        type: string;
        ref: string;
    };
};

/**
 * @zod-to-schema
 */
export type ListTestCasesRes = {
    items: Array<GetTestCaseRes>;
    total: number;
};

export default function handle(ctx: CtxGet<GetTestCaseRes | ListTestCasesRes, GetTestCaseReq>): void {
    const project = ctx.project as Project;
    
    // Extract test case ID from path or query parameter
    const testCaseId = ctx.request.getParameter('id') || extractIdFromPath(ctx.request.path);
    const query = ctx.request.query;

    // Instantiate repository
    const repository = new YouTrackTestCaseRepository(
        project,
        ctx.settings,
        undefined // appHost - optional, will use scripting API if available
    );

    // If ID is provided, return single test case
    if (testCaseId) {
        repository.findByID(testCaseId).then((testCase) => {
            if (!testCase) {
                ctx.response.code = 404;
                ctx.response.json({ error: 'Test case not found' } as any);
                return;
            }

            const response: GetTestCaseRes = {
                id: testCase.id,
                summary: testCase.summary,
                description: testCase.description,
                executionTargetSnapshot: testCase.executionTargetSnapshot ? {
                    id: testCase.executionTargetSnapshot.id,
                    name: testCase.executionTargetSnapshot.name,
                    type: testCase.executionTargetSnapshot.type,
                    ref: testCase.executionTargetSnapshot.ref
                } : undefined
            };

            ctx.response.json(response);
        }).catch((error) => {
            ctx.response.code = 500;
            ctx.response.json({ error: error.message || 'Failed to retrieve test case' } as any);
        });
        return;
    }

    // Otherwise, return list of test cases
    const limit = query.limit ? parseInt(query.limit as string, 10) : 100;
    const offset = query.offset ? parseInt(query.offset as string, 10) : 0;
    const search = query.search as string | undefined;
    const suiteId = query.suiteId as string | undefined;

    // Query all issues with testCaseId extension property
    findIssuesByExtensionProperty('testCaseId', project, ctx.settings).then((issues) => {
        // Map issues to test cases
        let testCases = issues.map(issue => {
            const extProps = (issue as any).extensionProperties || {};
            const tcId = extProps.testCaseId || issue.id!;
            
            // Build execution target snapshot if available
            let executionTargetSnapshot: any = undefined;
            if (extProps.executionTargetId) {
                executionTargetSnapshot = {
                    id: extProps.executionTargetId,
                    name: extProps.executionTargetName || '',
                    type: extProps.executionTargetType || '',
                    ref: extProps.executionTargetRef || ''
                };
            }

            return {
                id: tcId,
                summary: issue.summary || '',
                description: issue.description || '',
                executionTargetSnapshot
            };
        });

        // Apply suite filter if provided
        if (suiteId) {
            const testSuiteRepo = new YouTrackTestSuiteRepository(
                project,
                ctx.settings,
                undefined
            );
            testSuiteRepo.findByID(suiteId).then((suite) => {
                if (suite) {
                    testCases = testCases.filter(tc => suite.testCaseIDs.includes(tc.id));
                }
                applyFiltersAndRespond();
            }).catch(() => applyFiltersAndRespond());
        } else {
            applyFiltersAndRespond();
        }

        function applyFiltersAndRespond() {
            // Apply search filter if provided
            if (search) {
                const searchLower = search.toLowerCase();
                testCases = testCases.filter(testCase => 
                    testCase.summary.toLowerCase().includes(searchLower) ||
                    testCase.description.toLowerCase().includes(searchLower)
                );
            }

            // Apply pagination
            const total = testCases.length;
            const paginatedCases = testCases.slice(offset, offset + limit);

            const response: ListTestCasesRes = {
                items: paginatedCases,
                total
            };

            ctx.response.json(response);
        }
    }).catch((error) => {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to list test cases' } as any);
    });
}

/**
 * Helper function to find issues by extension property
 */
async function findIssuesByExtensionProperty(propertyName: string, project: Project, settings: AppSettings): Promise<Issue[]> {
    // Try scripting API first
    try {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        // Find all issues that have the extension property set (any value)
        const issues = entities.Issue.findByExtensionProperties({
            [propertyName]: { $exists: true }
        });
        
        if (issues && issues.size > 0) {
            return Array.from(issues).map((issue: any) => ({
                id: issue.id,
                summary: issue.summary,
                description: issue.description,
                extensionProperties: issue.extensionProperties,
                customFields: issue.fields ? Object.keys(issue.fields).map((name: string) => ({
                    name,
                    value: issue.fields[name]
                })) : []
            } as Issue));
        }
    } catch (e) {
        // Scripting API not available, fallback to empty array
        // In production with appHost, would use REST API: /api/issues?query=extensionProperties.testCaseId:*
    }

    return [];
}

/**
 * Extracts test case ID from path
 * Handles paths like: /project/testCases/{id} or /testCases/{id}
 */
function extractIdFromPath(path: string): string | undefined {
    const match = path.match(/\/testCases\/([^\/\?]+)/);
    return match ? match[1] : undefined;
}

export type Handle = typeof handle;
