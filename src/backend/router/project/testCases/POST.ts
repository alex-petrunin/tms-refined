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

export default function handle(ctx: CtxPost<CreateTestCaseReq, CreateTestCaseRes>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const body = ctx.request.json();

    // Validate required fields
    if (!body.summary || typeof body.summary !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Summary is required' } as any);
        return;
    }

    try {
        // Find the YouTrack project entity
        const ytProject = entities.Project.findByKey(ctx.project.shortName || ctx.project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Generate unique ID for the test case
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const testCaseId = `tc_${timestamp}_${random}`;

        // Create the issue using the scripting API
        const issue = new entities.Issue(ctx.currentUser, ytProject, body.summary);
        
        // Set description if provided
        if (body.description) {
            issue.description = body.description;
        }

        // Set testCaseId extension property
        issue.extensionProperties.testCaseId = testCaseId;

        // Set TMS Kind custom field to "Test Case" if it exists
        try {
            const kindField = issue.project.findFieldByName('TMS Kind');
            if (kindField) {
                const testCaseValue = kindField.findValueByName('Test Case');
                if (testCaseValue) {
                    issue.fields['TMS Kind'] = testCaseValue;
                }
            }
        } catch (fieldError) {
            console.warn('Could not set TMS Kind field:', fieldError);
        }

        // Set Test Suite custom field if suiteId provided
        if (body.suiteId) {
            issue.extensionProperties.suiteId = body.suiteId;
            
            try {
                // Find suite name from project extension properties
                const suitesJson = ytProject.extensionProperties.testSuites;
                if (suitesJson) {
                    const suites = JSON.parse(suitesJson);
                    const suite = suites.find((s: any) => s.id === body.suiteId);
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
                console.warn('Could not set Test Suite field:', suiteError);
            }
        }

        // Return the created test case
        const response: CreateTestCaseRes = {
            id: testCaseId,
            issueId: issue.idReadable || issue.id || '',
            summary: issue.summary || body.summary,
            description: issue.description || body.description || '',
            suiteId: body.suiteId
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to create test case: ${error}` } as any);
    }
}

export type Handle = typeof handle;
