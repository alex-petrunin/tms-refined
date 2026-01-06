import { CreateTestCaseSyncUseCase } from "../../../application/usecases/CreateTestCaseSync";
import { YouTrackTestCaseRepositorySync } from "../../../infrastructure/adapters/YouTrackTestCaseRepositorySync";

/**
 * @zod-to-schema
 */
export type CreateTestCaseReq = {
    projectId: string;
    summary: string;
    description?: string;
    suiteId?: string;
};

/**
 * @zod-to-schema
 */
export type CreateTestCaseRes = {
    id: string;
    issueId: string;
    summary: string;
    description: string;
    suiteId?: string;
};

/**
 * Create Test Case Handler - DDD Approach
 * Uses CreateTestCaseSyncUseCase and YouTrackTestCaseRepositorySync
 */
export default function handle(ctx: CtxPost<CreateTestCaseReq, CreateTestCaseRes>): void {
    // Helper: Find issue by test case ID
    const findIssueByTestCaseId = (testCaseId: string, project: any): any => {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        try {
            const issues = entities.Issue.findByExtensionProperties({
                testCaseId: testCaseId
            });
            
            if (issues && issues.size > 0) {
                return Array.from(issues)[0];
            }
        } catch (e) {
            // Fallback: search manually
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

    // Helper: Associate test case with suite (YouTrack-specific infrastructure)
    const associateWithSuite = (ytProject: any, issue: any, testCaseId: string, suiteId: string): void => {
        if (!issue) return;
        
        try {
            // Set extension property
            issue.extensionProperties.suiteId = suiteId;
            
            // Find suite name from project extension properties
            const suitesJson = ytProject.extensionProperties.testSuites;
            if (suitesJson) {
                const suites = JSON.parse(suitesJson);
                const suite = suites.find((s: any) => s.id === suiteId);
                if (suite) {
                    // Set Test Suite custom field
                    const testSuiteField = issue.project.findFieldByName('Test Suite');
                    if (testSuiteField) {
                        let testSuiteValue = testSuiteField.findValueByName(suite.name);
                        if (!testSuiteValue) {
                            testSuiteValue = testSuiteField.createValue(suite.name);
                        }
                        if (testSuiteValue) {
                            issue.fields['Test Suite'] = testSuiteValue;
                        }
                    }
                    
                    // Update suite's testCaseIDs array
                    if (!suite.testCaseIDs.includes(testCaseId)) {
                        suite.testCaseIDs.push(testCaseId);
                        ytProject.extensionProperties.testSuites = JSON.stringify(suites);
                    }
                }
            }
        } catch (suiteError) {
            console.warn('Could not associate with suite:', suiteError);
        }
    };

    try {
        console.log('[POST testCases] Handler called');
        
        const body = ctx.request.json();

        // Validate required fields
        if (!body.summary || typeof body.summary !== 'string') {
            ctx.response.code = 400;
            ctx.response.json({ error: 'Summary is required' } as any);
            return;
        }

        try {
        // Verify project exists
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const projectKey = ctx.project.shortName || ctx.project.key;
        const ytProject = entities.Project.findByKey(projectKey);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Initialize repository and use case
        const repository = new YouTrackTestCaseRepositorySync(projectKey, ctx.currentUser);
        const useCase = new CreateTestCaseSyncUseCase(repository);

        // Execute use case to create test case
        const testCaseId = useCase.execute({
            summary: body.summary,
            description: body.description
        });

        // Get the created issue directly from the repository (no need to search)
        const issue = repository.getLastCreatedIssue();
        
        if (!issue) {
            throw new Error('Failed to retrieve created issue from repository');
        }

        // Handle suite association (infrastructure concern)
        if (body.suiteId) {
            associateWithSuite(ytProject, issue, testCaseId, body.suiteId);
        }

        // Map to response directly from input data (we just created it)
        // testCaseId is now the actual issue ID (e.g., "TEST-123")
        const actualIssueId = issue.idReadable || issue.id;
        const response: CreateTestCaseRes = {
            id: testCaseId, // This is the issue ID returned by use case
            issueId: actualIssueId,
            summary: body.summary,
            description: body.description || '',
            suiteId: body.suiteId
        };

        ctx.response.json(response);
        } catch (innerError: any) {
            console.error('[POST testCases] Inner error:', innerError);
            console.error('[POST testCases] Error message:', innerError?.message);
            console.error('[POST testCases] Error stack:', innerError?.stack);
            ctx.response.code = 500;
            ctx.response.json({ error: innerError?.message || `Failed to create test case: ${innerError}` } as any);
        }
    } catch (outerError: any) {
        console.error('[POST testCases] Outer error (handler initialization):', outerError);
        console.error('[POST testCases] Error message:', outerError?.message);
        console.error('[POST testCases] Error stack:', outerError?.stack);
        ctx.response.code = 500;
        ctx.response.json({ error: outerError?.message || 'Handler initialization failed' } as any);
    }
}

export type Handle = typeof handle;
