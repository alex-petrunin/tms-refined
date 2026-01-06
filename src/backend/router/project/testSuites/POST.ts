import { CreateTestSuiteUseCase } from "@backend/application/usecases/CreateTestSuite";
import { YouTrackTestSuiteRepository } from "@backend/infrastructure/adapters/YouTrackTestSuiteRepository";

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
    const body = ctx.request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Name is required' } as any);
        return;
    }

    try {
        // Verify project exists
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const ytProject = entities.Project.findByKey(ctx.project.shortName || ctx.project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Initialize repository and use case
        const repository = new YouTrackTestSuiteRepository(ctx.project);
        const useCase = new CreateTestSuiteUseCase(repository);

        // Execute use case
        const testSuite = useCase.execute({
            name: body.name,
            description: body.description
        });

        // Create custom field value for dropdown (optional)
        try {
            const testSuiteField = ytProject.findFieldByName('Test Suite');
            if (testSuiteField && testSuiteField.createValue) {
                const existingValue = testSuiteField.findValueByName(body.name);
                if (!existingValue) {
                    testSuiteField.createValue(body.name);
                }
            }
        } catch (fieldError) {
            console.error("Failed to create Test Suite custom field value:", fieldError);
        }

        // Map to response
        const response: CreateTestSuiteRes = {
            id: testSuite.id,
            name: testSuite.name,
            description: testSuite.description,
            testCaseIDs: testSuite.testCaseIDs
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to create test suite: ${error}` } as any);
    }
}

export type Handle = typeof handle;
