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
        // Find the YouTrack project entity
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
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

        // Set TMS Kind custom field to "Test Run" if it exists
        try {
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
        } catch (fieldError) {
            console.warn('[POST testRuns] Could not set TMS Kind field:', fieldError);
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
