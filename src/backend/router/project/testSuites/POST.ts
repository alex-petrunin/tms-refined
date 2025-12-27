/**
 * @zod-to-schema
 */
export type CreateTestSuiteReq = {
    projectId: string;
    name: string;
    description?: string;
};

/**
 * @zod-to-schema
 */
export type CreateTestSuiteRes = {
    id: string;
    name: string;
    description: string;
    testCaseIDs: string[];
};

export default function handle(ctx: CtxPost<CreateTestSuiteReq, CreateTestSuiteRes>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const project = ctx.project;
    const body = ctx.request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Name is required' } as any);
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

        // Generate unique ID for the test suite
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const testSuiteId = `ts_${timestamp}_${random}`;

        // Create new test suite object
        const newTestSuite = {
            id: testSuiteId,
            name: body.name,
            description: body.description || '',
            testCaseIDs: [] as string[]
        };

        // Add to suites array
        suites.push(newTestSuite);

        // Save to project extension properties
        ytProject.extensionProperties.testSuites = JSON.stringify(suites);

        // Also create a custom field value for the "Test Suite" enum field
        // This allows test cases to reference this suite via a dropdown
        try {
            const testSuiteField = ytProject.findFieldByName('Test Suite');
            if (testSuiteField && testSuiteField.createValue) {
                // Check if value already exists
                const existingValue = testSuiteField.findValueByName(body.name);
                if (!existingValue) {
                    testSuiteField.createValue(body.name);
                }
            }
        } catch (fieldError) {
            // Custom field creation is optional - don't fail the whole operation
            console.error("Failed to create Test Suite custom field value:", fieldError);
        }

        // Return the created test suite
        const response: CreateTestSuiteRes = {
            id: newTestSuite.id,
            name: newTestSuite.name,
            description: newTestSuite.description,
            testCaseIDs: newTestSuite.testCaseIDs
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to create test suite: ${error}` } as any);
    }
}

export type Handle = typeof handle;
