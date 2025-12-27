/**
 * @zod-to-schema
 */
export type UpdateTestSuiteReq = {
    projectId: string;
    id: string;
    name?: string;
    description?: string;
    testCaseIDs?: string[];
};

/**
 * @zod-to-schema
 */
export type UpdateTestSuiteRes = {
    id: string;
    name: string;
    description: string;
    testCaseIDs: string[];
};

export default function handle(ctx: CtxPut<UpdateTestSuiteReq, UpdateTestSuiteRes>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const project = ctx.project;
    const body = ctx.request.json();

    // Get test suite ID from request body
    const testSuiteId = body.id;

    if (!testSuiteId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test suite ID is required' } as any);
        return;
    }

    try {
        // Find the YouTrack project entity for writing
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Load existing test suites from project extension properties
        let suites: Array<{id: string; name: string; description: string; testCaseIDs: string[]}> = [];
        const extProps = ytProject.extensionProperties || {};
        const suitesJson = extProps.testSuites;
        
        if (suitesJson && typeof suitesJson === 'string') {
            try {
                suites = JSON.parse(suitesJson);
            } catch (e) {
                console.error("Failed to parse existing suites:", e);
            }
        }
        
        // Find the test suite to update
        const suiteIndex = suites.findIndex(s => s.id === testSuiteId);
        
        if (suiteIndex === -1) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Test suite not found' } as any);
            return;
        }

        // Update fields if provided
        const suite = suites[suiteIndex];
        const oldName = suite.name;
        
        if (body.name !== undefined) {
            suite.name = body.name;
        }
        if (body.description !== undefined) {
            suite.description = body.description;
        }
        if (body.testCaseIDs !== undefined) {
            suite.testCaseIDs = body.testCaseIDs;
        }

        // If name changed, update the custom field value
        if (body.name !== undefined && body.name !== oldName) {
            try {
                const testSuiteField = ytProject.findFieldByName('Test Suite');
                if (testSuiteField) {
                    // Create new value with new name if it doesn't exist
                    const existingNewValue = testSuiteField.findValueByName(body.name);
                    if (!existingNewValue && testSuiteField.createValue) {
                        testSuiteField.createValue(body.name);
                    }
                    // Note: We don't delete the old value as other items might reference it
                }
            } catch (fieldError) {
                console.error("Failed to update Test Suite custom field value:", fieldError);
            }
        }

        // Save updated test suites to project extension properties
        ytProject.extensionProperties.testSuites = JSON.stringify(suites);

        // Return the updated test suite
        const response: UpdateTestSuiteRes = {
            id: suite.id,
            name: suite.name,
            description: suite.description,
            testCaseIDs: suite.testCaseIDs
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to update test suite' } as any);
    }
}

export type Handle = typeof handle;
