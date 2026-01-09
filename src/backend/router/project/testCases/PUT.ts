import { UpdateTestCaseSyncUseCase } from "../../../application/usecases/UpdateTestCaseSync";
import { YouTrackTestCaseRepositorySync } from "../../../infrastructure/adapters/YouTrackTestCaseRepositorySync";
import { ExecutionTargetSnapshot } from "../../../domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "../../../domain/enums/ExecutionTargetType";

/**
 * @zod-to-schema
 */
export type ExecutionTargetInput = {
    integrationId: string;
    name: string;
    type: string;
    config: Record<string, any>;
};

/**
 * @zod-to-schema
 */
export type UpdateTestCaseReq = {
    projectId: string;
    id: string;
    issueId?: string;
    summary?: string;
    description?: string;
    suiteId?: string;
    executionTarget?: ExecutionTargetInput | null;
};

/**
 * @zod-to-schema
 */
export type UpdateTestCaseRes = {
    id: string;
    issueId?: string;
    summary: string;
    description: string;
    suiteId?: string;
    executionTarget?: ExecutionTargetInput;
};

/**
 * Update Test Case Handler - DDD Approach
 * Uses UpdateTestCaseSyncUseCase and YouTrackTestCaseRepositorySync
 */
export default function handle(ctx: CtxPut<UpdateTestCaseReq, UpdateTestCaseRes>): void {
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

    // Helper: Update suite association (YouTrack-specific infrastructure)
    const updateSuiteAssociation = (
        ytProject: any,
        issue: any,
        testCaseId: string,
        oldSuiteId: string | undefined,
        newSuiteId: string | undefined
    ): void => {
    try {
        // Update extension property
        issue.extensionProperties.suiteId = newSuiteId || '';

        const suitesJson = ytProject.extensionProperties.testSuites;
        if (suitesJson) {
            const suites = JSON.parse(suitesJson);
            
            // Remove from old suite's testCaseIDs
            if (oldSuiteId) {
                const oldSuite = suites.find((s: any) => s.id === oldSuiteId);
                if (oldSuite && oldSuite.testCaseIDs) {
                    oldSuite.testCaseIDs = oldSuite.testCaseIDs.filter((id: string) => id !== testCaseId);
                }
            }
            
            // Add to new suite's testCaseIDs and update custom field
            if (newSuiteId) {
                const newSuite = suites.find((s: any) => s.id === newSuiteId);
                if (newSuite) {
                    if (!newSuite.testCaseIDs) {
                        newSuite.testCaseIDs = [];
                    }
                    if (!newSuite.testCaseIDs.includes(testCaseId)) {
                        newSuite.testCaseIDs.push(testCaseId);
                    }
                    
                    // Update Test Suite custom field
                    try {
                        const testSuiteField = issue.project.findFieldByName('Test Suite');
                        if (testSuiteField) {
                            let testSuiteValue = testSuiteField.findValueByName(newSuite.name);
                            if (!testSuiteValue) {
                                testSuiteValue = testSuiteField.createValue(newSuite.name);
                            }
                            if (testSuiteValue) {
                                issue.fields['Test Suite'] = testSuiteValue;
                            }
                        }
                    } catch (fieldError) {
                        console.warn('Could not update Test Suite field:', fieldError);
                    }
                }
            } else {
                // Clear Test Suite custom field
                try {
                    issue.fields['Test Suite'] = null;
                } catch (fieldError) {
                    console.warn('Could not clear Test Suite field:', fieldError);
                }
            }
            
            // Save updated suites
            ytProject.extensionProperties.testSuites = JSON.stringify(suites);
        }
    } catch (suiteError) {
        console.warn('Could not update suite references:', suiteError);
    }
    };

    const body = ctx.request.json();

    // Validate required fields
    if (!body.id || typeof body.id !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test case ID is required' } as any);
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

        // Validate execution target if provided
        let executionTargetSnapshot: ExecutionTargetSnapshot | undefined;
        if (body.executionTarget) {
            // Load integrations to validate
            let integrations: any[] = [];
            try {
                const integrationsJson = ytProject.extensionProperties.integrations;
                if (integrationsJson && typeof integrationsJson === 'string') {
                    integrations = JSON.parse(integrationsJson);
                }
            } catch (e) {
                console.warn('Failed to parse integrations:', e);
            }

            // Find the integration
            const integration = integrations.find(i => i.id === body.executionTarget?.integrationId);
            if (!integration) {
                ctx.response.code = 400;
                ctx.response.json({ error: `Integration not found: ${body.executionTarget.integrationId}` } as any);
                return;
            }

            if (!integration.enabled) {
                ctx.response.code = 400;
                ctx.response.json({ error: `Integration is disabled: ${integration.name}` } as any);
                return;
            }

            // Create execution target snapshot
            executionTargetSnapshot = new ExecutionTargetSnapshot(
                body.executionTarget.integrationId,
                body.executionTarget.name,
                body.executionTarget.type as ExecutionTargetType,
                body.executionTarget.config
            );
        } else if (body.executionTarget === null) {
            // Explicitly clear execution target
            executionTargetSnapshot = undefined;
        }

        // Initialize repository and use case
        const repository = new YouTrackTestCaseRepositorySync(projectKey, ctx.currentUser);
        const useCase = new UpdateTestCaseSyncUseCase(repository);

        // Execute use case to update test case
        // Note: We don't pre-check existence because the test case might not be searchable yet
        // The use case will handle creating if it doesn't exist
        const updatedTestCase = useCase.execute({
            testCaseID: body.id,
            summary: body.summary,
            description: body.description,
            executionTargetSnapshot: executionTargetSnapshot
        });

        // Find the issue for suite management and getting issue ID
        const issue = findIssueByTestCaseId(body.id, ytProject);

        // Handle suite change if requested (infrastructure concern)
        const oldSuiteId = issue?.extensionProperties?.suiteId;
        if ('suiteId' in body && body.suiteId !== oldSuiteId && issue) {
            updateSuiteAssociation(ytProject, issue, body.id, oldSuiteId, body.suiteId);
        }

        // Map to response
        const response: UpdateTestCaseRes = {
            id: body.id,
            issueId: issue?.idReadable || issue?.id || '',
            summary: updatedTestCase.summary,
            description: updatedTestCase.description,
            suiteId: issue?.extensionProperties?.suiteId || body.suiteId
        };

        // Include execution target in response if it exists
        if (updatedTestCase.executionTargetSnapshot) {
            response.executionTarget = {
                integrationId: updatedTestCase.executionTargetSnapshot.integrationId,
                name: updatedTestCase.executionTargetSnapshot.name,
                type: updatedTestCase.executionTargetSnapshot.type,
                config: updatedTestCase.executionTargetSnapshot.config
            };
        }

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to update test case: ${error}` } as any);
    }
}

export type Handle = typeof handle;
