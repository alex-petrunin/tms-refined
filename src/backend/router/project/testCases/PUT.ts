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
};

export default function handle(ctx: CtxPut<UpdateTestCaseReq, UpdateTestCaseRes>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const search = require('@jetbrains/youtrack-scripting-api/search');
    const project = ctx.project;
    const body = ctx.request.json();

    // Validate required fields
    if (!body.id || typeof body.id !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test case ID is required' } as any);
        return;
    }

    try {
        // Find the YouTrack project entity
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Search for the issue with matching testCaseId extension property
        const allIssues = search.search(ytProject, '') || [];
        
        // Convert to array if needed
        const issuesArray: any[] = [];
        if (allIssues && typeof allIssues.forEach === 'function') {
            allIssues.forEach((issue: any) => {
                issuesArray.push(issue);
            });
        } else if (Array.isArray(allIssues)) {
            issuesArray.push(...allIssues);
        }

        // Find the issue with matching testCaseId
        let issueToUpdate = null;
        let youtrackIssueId: string | null = null;
        
        for (let i = 0; i < issuesArray.length && i < 1000; i++) {
            const issue = issuesArray[i];
            if (!issue) continue;
            
            const extProps = issue.extensionProperties || {};
            if (extProps.testCaseId === body.id) {
                // Found the matching issue - get a fresh reference using internal ID
                youtrackIssueId = issue.idReadable || issue.id;
                const internalId = issue.id;
                issueToUpdate = entities.Issue.findById(internalId);
                
                // If findById failed, use the original reference
                if (!issueToUpdate) {
                    issueToUpdate = issue;
                }
                break;
            }
        }

        if (!issueToUpdate) {
            ctx.response.code = 404;
            ctx.response.json({ error: `Test case not found: ${body.id}` } as any);
            return;
        }

        // Store old values before update
        const oldSuiteId = issueToUpdate.extensionProperties.suiteId;
        const testCaseId = body.id;

        // Update issue fields - only if explicitly provided
        if (body.summary !== undefined && body.summary !== null) {
            issueToUpdate.summary = body.summary;
        }
        if (body.description !== undefined && body.description !== null) {
            issueToUpdate.description = body.description;
        }

        // Handle suite change - only if suiteId is explicitly in the request
        if ('suiteId' in body && body.suiteId !== oldSuiteId) {
            // Update extension property
            issueToUpdate.extensionProperties.suiteId = body.suiteId || '';

            try {
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
                    if (body.suiteId) {
                        const newSuite = suites.find((s: any) => s.id === body.suiteId);
                        if (newSuite) {
                            if (!newSuite.testCaseIDs) {
                                newSuite.testCaseIDs = [];
                            }
                            if (!newSuite.testCaseIDs.includes(testCaseId)) {
                                newSuite.testCaseIDs.push(testCaseId);
                            }
                            
                            // Update Test Suite custom field
                            try {
                                const testSuiteField = issueToUpdate.project.findFieldByName('Test Suite');
                                if (testSuiteField) {
                                    let testSuiteValue = testSuiteField.findValueByName(newSuite.name);
                                    if (!testSuiteValue) {
                                        testSuiteValue = testSuiteField.createValue(newSuite.name);
                                    }
                                    if (testSuiteValue) {
                                        issueToUpdate.fields['Test Suite'] = testSuiteValue;
                                    }
                                }
                            } catch (fieldError) {
                                console.warn('Could not update Test Suite field:', fieldError);
                            }
                        }
                    } else {
                        // Clear Test Suite custom field
                        try {
                            issueToUpdate.fields['Test Suite'] = null;
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
        }

        // Return the updated test case
        const response: UpdateTestCaseRes = {
            id: testCaseId,
            issueId: issueToUpdate.idReadable || youtrackIssueId || '',
            summary: issueToUpdate.summary || '',
            description: issueToUpdate.description || '',
            suiteId: issueToUpdate.extensionProperties.suiteId || undefined
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to update test case: ${error}` } as any);
    }
}

export type Handle = typeof handle;
