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
        // Load existing test suites (inline)
        let suites: Array<{id: string; name: string; description: string; testCaseIDs: string[]}> = [];
        const extProps = project.extensionProperties || {};
        const suitesJson = extProps.testSuites;
        
        if (suitesJson && typeof suitesJson === 'string') {
            suites = JSON.parse(suitesJson);
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
        if (body.name !== undefined) {
            suite.name = body.name;
        }
        if (body.description !== undefined) {
            suite.description = body.description;
        }
        if (body.testCaseIDs !== undefined) {
            suite.testCaseIDs = body.testCaseIDs;
        }

        // Save updated test suites using YouTrack scripting API
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        // Use findByKey with project shortName (e.g., "DEM")
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
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
