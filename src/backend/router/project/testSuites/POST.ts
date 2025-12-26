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

    // Generate unique ID for the test suite
    const testSuiteId = `ts-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Load existing test suites from project extension properties
    const extProps = (project as any).extensionProperties || {};
    let suites: Array<{ id: string; name: string; description: string; testCaseIDs: string[] }> = [];
    
    if (extProps.testSuites && typeof extProps.testSuites === 'string') {
        try {
            suites = JSON.parse(extProps.testSuites);
        } catch (e) {
            suites = [];
        }
    }

    // Create new test suite
    const newSuite = {
        id: testSuiteId,
        name: body.name,
        description: body.description || '',
        testCaseIDs: []
    };

    // Add to collection
    suites.push(newSuite);

    // Save back to project extension properties using scripting API
    try {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const projectEntity = entities.Project.findById(project.id);
        if (projectEntity) {
            projectEntity.extensionProperties.testSuites = JSON.stringify(suites);
        } else {
            // Fallback: set directly on context project's extensionProperties
            (project as any).extensionProperties.testSuites = JSON.stringify(suites);
        }
    } catch (e) {
        // Scripting API not available - set property directly on extensionProperties object
        (project as any).extensionProperties.testSuites = JSON.stringify(suites);
    }

    // Return the created test suite
    const response: CreateTestSuiteRes = {
        id: newSuite.id,
        name: newSuite.name,
        description: newSuite.description,
        testCaseIDs: newSuite.testCaseIDs
    };

    ctx.response.json(response);
}

export type Handle = typeof handle;

