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

export default function handle(ctx: CtxPost<CreateTestRunReq, CreateTestRunRes>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const project = ctx.project;
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

        // Generate unique ID for the test run
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const testRunId = `tr_${timestamp}_${random}`;

        // Determine execution target
        const executionTarget = {
            id: body.executionTarget?.id || `et_${timestamp}_${random}`,
            name: body.executionTarget?.name || 'Manual Execution',
            type: body.executionTarget?.type || 'MANUAL',
            ref: body.executionTarget?.ref || ''
        };

        // Determine initial status based on execution mode
        const initialStatus = body.executionMode === 'OBSERVED' 
            ? 'AWAITING_EXTERNAL_RESULTS' 
            : 'PENDING';

        // Create the issue for the test run
        const summary = `Test Run: ${body.testCaseIDs.length} test case(s) from ${body.suiteID}`;
        const issue = new entities.Issue(ctx.currentUser, ytProject, summary);

        // Set description
        issue.description = `Test Run ID: ${testRunId}\n` +
            `Suite: ${body.suiteID}\n` +
            `Test Cases: ${body.testCaseIDs.join(', ')}\n` +
            `Execution Target: ${executionTarget.type} - ${executionTarget.name}`;

        // Set extension properties
        issue.extensionProperties.testRunId = testRunId;
        issue.extensionProperties.testRunStatus = initialStatus;
        issue.extensionProperties.testSuiteId = body.suiteID;
        issue.extensionProperties.testCaseIds = body.testCaseIDs.join(',');
        issue.extensionProperties.executionTargetId = executionTarget.id;
        issue.extensionProperties.executionTargetName = executionTarget.name;
        issue.extensionProperties.executionTargetType = executionTarget.type;
        issue.extensionProperties.executionTargetRef = executionTarget.ref;

        // Set custom fields for execution metadata
        try {
            // TMS Kind
            const kindField = issue.project.findFieldByName('TMS Kind');
            if (kindField) {
                let testRunValue = kindField.findValueByName('Test Run');
                if (!testRunValue) {
                    testRunValue = kindField.createValue('Test Run');
                }
                if (testRunValue) {
                    issue.fields['TMS Kind'] = testRunValue;
                }
            }
            
            // Test Run Status
            const statusField = issue.project.findFieldByName('Test Run Status');
            if (statusField) {
                const statusValue = statusField.findValueByName(
                    initialStatus === 'AWAITING_EXTERNAL_RESULTS' ? 'Awaiting External Results' :
                    initialStatus === 'PENDING' ? 'Pending' :
                    initialStatus === 'RUNNING' ? 'Running' :
                    initialStatus === 'PASSED' ? 'Passed' :
                    initialStatus === 'FAILED' ? 'Failed' : 'Pending'
                );
                if (statusValue) {
                    issue.fields['Test Run Status'] = statusValue;
                } else {
                    // Create value if it doesn't exist
                    const newStatusValue = statusField.createValue(
                        initialStatus === 'AWAITING_EXTERNAL_RESULTS' ? 'Awaiting External Results' :
                        initialStatus === 'PENDING' ? 'Pending' :
                        initialStatus === 'RUNNING' ? 'Running' :
                        initialStatus === 'PASSED' ? 'Passed' :
                        initialStatus === 'FAILED' ? 'Failed' : 'Pending'
                    );
                    if (newStatusValue) {
                        issue.fields['Test Run Status'] = newStatusValue;
                    }
                }
            }
            
            // Execution Target Type
            const executionTargetTypeField = issue.project.findFieldByName('Execution Target Type');
            if (executionTargetTypeField) {
                const typeValue = executionTargetTypeField.findValueByName(
                    executionTarget.type === 'GITLAB' ? 'GitLab' :
                    executionTarget.type === 'GITHUB' ? 'GitHub' :
                    'Manual'
                );
                if (typeValue) {
                    issue.fields['Execution Target Type'] = typeValue;
                } else {
                    const newTypeValue = executionTargetTypeField.createValue(
                        executionTarget.type === 'GITLAB' ? 'GitLab' :
                        executionTarget.type === 'GITHUB' ? 'GitHub' :
                        'Manual'
                    );
                    if (newTypeValue) {
                        issue.fields['Execution Target Type'] = newTypeValue;
                    }
                }
            }
            
            // Execution Target Reference
            const executionTargetRefField = issue.project.findFieldByName('Execution Target Reference');
            if (executionTargetRefField && executionTarget.ref) {
                issue.fields['Execution Target Reference'] = executionTarget.ref;
            }
            
            // Execution Target Name (if custom field exists)
            const executionTargetNameField = issue.project.findFieldByName('Execution Target Name');
            if (executionTargetNameField && executionTarget.name) {
                issue.fields['Execution Target Name'] = executionTarget.name;
            }
            
            // Test Suite
            if (body.suiteID) {
                const testSuiteField = issue.project.findFieldByName('Test Suite');
                if (testSuiteField) {
                    // Try to find suite by ID or name
                    let suiteValue = testSuiteField.findValueByName(body.suiteID);
                    if (!suiteValue) {
                        // Try to get suite name from project extension properties
                        try {
                            const suitesJson = ytProject.extensionProperties.testSuites;
                            if (suitesJson) {
                                const suites = JSON.parse(suitesJson);
                                const suite = suites.find((s: any) => s.id === body.suiteID);
                                if (suite && suite.name) {
                                    suiteValue = testSuiteField.findValueByName(suite.name);
                                    if (!suiteValue) {
                                        suiteValue = testSuiteField.createValue(suite.name);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[POST testRuns] Could not load suite name:', e);
                        }
                    }
                    if (suiteValue) {
                        issue.fields['Test Suite'] = suiteValue;
                    }
                }
            }
        } catch (fieldError) {
            console.warn('[POST testRuns] Could not set custom fields:', fieldError);
        }

        console.log('[POST testRuns] Created test run:', testRunId, 'issueId:', issue.idReadable || issue.id);

        // Return the created test run
        const response: CreateTestRunRes = {
            id: testRunId,
            issueId: issue.idReadable || issue.id || '',
            testCaseIDs: body.testCaseIDs,
            testSuiteID: body.suiteID,
            status: initialStatus,
            executionTarget: executionTarget
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to create test run: ${error}` } as any);
    }
}

export type Handle = typeof handle;
