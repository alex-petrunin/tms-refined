import { CreateTestRunSyncUseCase } from "../../../application/usecases/CreateTestRunSync";
import { YouTrackTestRunRepositorySync } from "../../../infrastructure/adapters/YouTrackTestRunRepositorySync";

/**
 * @zod-to-schema
 */
export type CreateTestRunReq = {
    projectId: string;
    suiteID: string;
    testCaseIDs: string[];
    executionMode?: "MANAGED" | "OBSERVED";
    executionTarget?: {
        id?: string;
        name?: string;
        type?: "GITLAB" | "GITHUB" | "MANUAL";
        ref?: string;
    };
};

/**
 * @zod-to-schema
 */
export type CreateTestRunRes = {
    id: string;
    issueId: string;
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
 * Create Test Run Handler - DDD Approach
 * Uses CreateTestRunSyncUseCase and YouTrackTestRunRepositorySync
 */
export default function handle(ctx: CtxPost<CreateTestRunReq, CreateTestRunRes>): void {
    // Helper: Find issue by test run ID
    const findIssueByTestRunId = (testRunId: string, project: any): any => {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        // Try to find by issue ID first (testRunId is now the actual issue ID like "TEST-123")
        try {
            const issue = entities.Issue.findById(testRunId);
            if (issue) {
                return issue;
            }
        } catch (e) {
            // Not found by ID, try extension property (legacy/fallback)
        }
        
        // Fallback: search by extension property
        try {
            const issues = entities.Issue.findByExtensionProperties({
                testRunId: testRunId
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
                if (extProps.testRunId === testRunId) {
                    return issue;
                }
            }
        }
        
        return null;
    };

    const body = ctx.request.json();

    // Validate required fields
    if (!body.suiteID || typeof body.suiteID !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Suite ID is required' } as any);
        return;
    }

    if (!body.testCaseIDs || !Array.isArray(body.testCaseIDs) || body.testCaseIDs.length === 0) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'At least one test case ID is required' } as any);
        return;
    }

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
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const ytProject = entities.Project.findByKey(targetProjectKey);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: `Test runs project not found: ${targetProjectKey}` } as any);
            return;
        }

        // Initialize repository and use case
        const repository = new YouTrackTestRunRepositorySync(targetProjectKey, ctx.currentUser);
        const useCase = new CreateTestRunSyncUseCase(repository);

        // Execute use case to create test run
        const testRunId = useCase.execute({
            suiteID: body.suiteID,
            testCaseIDs: body.testCaseIDs,
            executionMode: body.executionMode,
            executionTarget: body.executionTarget
        });

        // Get the created issue directly from the repository (no need to search)
        const issue = repository.getLastCreatedIssue();
        
        if (!issue) {
            throw new Error('Failed to retrieve created issue from repository');
        }

        console.log('[POST testRuns] Created test run:', testRunId, 'issueId:', issue?.idReadable || issue?.id);

        // Map to response directly from input data (we just created it)
        const response: CreateTestRunRes = {
            id: testRunId,
            issueId: issue.idReadable || issue.id || '',
            testCaseIDs: body.testCaseIDs,
            testSuiteID: body.suiteID,
            status: 'RUNNING', // Default status for new test runs
            executionTarget: {
                id: body.executionTarget?.id || '',
                name: body.executionTarget?.name || '',
                type: body.executionTarget?.type || 'MANUAL',
                ref: body.executionTarget?.ref || ''
            }
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to create test run: ${error}` } as any);
    }
}

export type Handle = typeof handle;
