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
    const project = ctx.project;
    const body = ctx.request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Name is required' } as any);
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

        // Generate unique ID
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const newId = `ts_${timestamp}_${random}`;

        // Create new test suite
        const newTestSuite = {
            id: newId,
            name: body.name,
            description: body.description || '',
            testCaseIDs: [] as string[]
        };

        // Add to suites array
        suites.push(newTestSuite);

        // Save to project extension properties using YouTrack scripting API
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        // Use findByKey with project shortName (e.g., "DEM")
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        ytProject.extensionProperties.testSuites = JSON.stringify(suites);

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
        ctx.response.json({ error: error.message || 'Failed to create test suite' } as any);
    }
}

export type Handle = typeof handle;
